import os
import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app, ensure_db_migrations
from app.core.database import Base, engine, get_db
from app.core.auth_security import create_access_token, hash_password
from app.models.vendor import Vendor
from app.models.customer import Customer
from app.models.item import Item
from app.models.transaction import Transaction
from app.models.bill import Bill

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    ensure_db_migrations()
    db = next(get_db())

    # Create Vendor A
    vendor_a_phone = "+919111122222"
    va = db.query(Vendor).filter(Vendor.phone == vendor_a_phone).first()
    if not va:
        va = Vendor(
            phone=vendor_a_phone,
            name="Ramesh Shopkeeper",
            shop_name="Ramesh Supermart",
            address="Camp, Pune",
            gstin="27ABCDE1234F1Z5",
            password_hash=hash_password("pass123")
        )
        db.add(va)

    # Create Vendor B (for isolation tests)
    vendor_b_phone = "+919333344444"
    vb = db.query(Vendor).filter(Vendor.phone == vendor_b_phone).first()
    if not vb:
        vb = Vendor(
            phone=vendor_b_phone,
            name="Suresh Shopkeeper",
            shop_name="Suresh Provisions",
            address="Kothrud, Pune",
            gstin="27FGHIJ5678K1Z2",
            password_hash=hash_password("pass123")
        )
        db.add(vb)

    # Create Customer 1
    cust_phone = "+919888877777"
    c = db.query(Customer).filter(Customer.phone == cust_phone).first()
    if not c:
        c = Customer(
            phone=cust_phone,
            name="Rahul Sharma",
            address="Baner, Pune",
            password_hash=hash_password("custpass")
        )
        db.add(c)

    # Create Customer B
    cust_b_phone = "+919999900000"
    cb = db.query(Customer).filter(Customer.phone == cust_b_phone).first()
    if not cb:
        cb = Customer(
            phone=cust_b_phone,
            name="Sita Patel",
            address="Aundh, Pune",
            password_hash=hash_password("custpass")
        )
        db.add(cb)

    # Clean existing items for vendor A
    db.query(Item).filter(Item.vendor.in_([vendor_a_phone, vendor_b_phone])).delete()
    db.query(Bill).filter(Bill.vendor_phone.in_([vendor_a_phone, vendor_b_phone])).delete()
    db.query(Transaction).filter(Transaction.vendor.in_([vendor_a_phone, vendor_b_phone])).delete()

    # Seed an inventory product with barcode for Vendor A
    tea_item = Item(
        vendor=vendor_a_phone,
        name="Wagh Bakri Tea 500g",
        unit="packet",
        qty=50.0,
        price=280.0,
        cost_price=240.0,
        barcode="8901030383458",
        sku="TEA-WB-500",
        tax_rate=5.0
    )
    db.add(tea_item)
    db.commit()
    yield


def test_customer_selection_and_addition():
    vendor_token = create_access_token({"sub": "+919111122222", "role": "vendor"})
    headers = {"Authorization": f"Bearer {vendor_token}"}

    # 1. Search existing customer
    res = client.get("/api/vendor/customers?q=Rahul", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data["customers"]) >= 1
    assert data["customers"][0]["name"] == "Rahul Sharma"

    # 2. Add new customer
    new_cust = {
        "name": "Priya Patil",
        "phone": "9822334455",
        "address": "Aundh, Pune",
        "city": "Pune"
    }
    res_add = client.post("/api/vendor/customers", json=new_cust, headers=headers)
    assert res_add.status_code == 200
    assert res_add.json()["success"] is True
    assert res_add.json()["customer"]["name"] == "Priya Patil"
    assert "+919822334455" in res_add.json()["customer"]["phone"]


def test_barcode_search_and_quick_add():
    vendor_token = create_access_token({"sub": "+919111122222", "role": "vendor"})
    headers = {"Authorization": f"Bearer {vendor_token}"}

    # 1. Search known barcode
    res_known = client.get("/api/vendor/inventory/barcode/8901030383458", headers=headers)
    assert res_known.status_code == 200
    assert res_known.json()["found"] is True
    assert res_known.json()["item"]["name"] == "Wagh Bakri Tea 500g"
    assert res_known.json()["item"]["price"] == 280.0

    # 2. Search unknown barcode
    res_unknown = client.get("/api/vendor/inventory/barcode/8901234567890", headers=headers)
    assert res_unknown.status_code == 200
    assert res_unknown.json()["found"] is False

    # 3. Quick-add product from unknown barcode
    form_data = {
        "name": "Britannia Marie Gold 250g",
        "unit": "packet",
        "price": "40.0",
        "cost_price": "32.0",
        "tax_rate": "5.0",
        "barcode": "8901234567890",
        "sku": "BIS-MARIE-250",
        "opening_stock": "30.0",
        "threshold": "5.0"
    }
    res_create = client.post("/api/vendor/inventory/quick-add", data=form_data, headers=headers)
    assert res_create.status_code == 200
    item_data = res_create.json()["item"]
    assert item_data["name"] == "Britannia Marie Gold 250g"
    assert item_data["qty"] == 30.0

    # 4. Search again by new barcode
    res_recheck = client.get("/api/vendor/inventory/barcode/8901234567890", headers=headers)
    assert res_recheck.status_code == 200
    assert res_recheck.json()["found"] is True
    assert res_recheck.json()["item"]["qty"] == 30.0


def test_draft_bill_vs_finalized_bill_stock_safety():
    vendor_token = create_access_token({"sub": "+919111122222", "role": "vendor"})
    headers = {"Authorization": f"Bearer {vendor_token}"}

    # Verify initial stock of Tea
    res_init = client.get("/api/vendor/inventory/barcode/8901030383458", headers=headers)
    assert res_init.json()["item"]["qty"] == 50.0

    # 1. Create DRAFT bill for 10 packets of Tea
    draft_payload = {
        "customer_name": "Rahul Sharma",
        "customer_phone": "+919888877777",
        "bill_type": "invoice",
        "status": "draft",
        "items": [
            {
                "product_name": "Wagh Bakri Tea 500g",
                "qty": 10.0,
                "unit": "packet",
                "unit_price": 280.0,
                "barcode": "8901030383458"
            }
        ],
        "discount": 50.0,
        "tax_rate": 5.0,
        "delivery_charge": 20.0
    }
    res_draft = client.post("/api/vendor/bills", json=draft_payload, headers=headers)
    assert res_draft.status_code == 200
    draft_data = res_draft.json()["bill"]
    bill_id = draft_data["id"]
    assert draft_data["status"] == "draft"
    assert draft_data["stock_deducted"] is False

    # Stock must remain unchanged after draft!
    res_after_draft = client.get("/api/vendor/inventory/barcode/8901030383458", headers=headers)
    assert res_after_draft.json()["item"]["qty"] == 50.0

    # 2. Finalize the bill
    res_final = client.post(f"/api/vendor/bills/{bill_id}/finalize", headers=headers)
    assert res_final.status_code == 200
    assert res_final.json()["bill"]["status"] == "finalized"
    assert res_final.json()["bill"]["stock_deducted"] is True

    # Stock must now be decremented by exactly 10!
    res_after_final = client.get("/api/vendor/inventory/barcode/8901030383458", headers=headers)
    assert res_after_final.json()["item"]["qty"] == 40.0

    # Repeating finalize must not deduct stock again (idempotency check)
    client.post(f"/api/vendor/bills/{bill_id}/finalize", headers=headers)
    res_recheck_stock = client.get("/api/vendor/inventory/barcode/8901030383458", headers=headers)
    assert res_recheck_stock.json()["item"]["qty"] == 40.0

    # 3. Controlled cancellation restores stock
    res_cancel = client.post(f"/api/vendor/bills/{bill_id}/cancel", headers=headers)
    assert res_cancel.status_code == 200
    assert res_cancel.json()["bill"]["status"] == "cancelled"

    # Stock must be restored back to 50!
    res_restored = client.get("/api/vendor/inventory/barcode/8901030383458", headers=headers)
    assert res_restored.json()["item"]["qty"] == 50.0


def test_customer_bills_history_and_pdf_access():
    vendor_token = create_access_token({"sub": "+919111122222", "role": "vendor"})
    cust_token = create_access_token({"sub": "+919888877777", "role": "customer", "phone": "+919888877777"})
    cust_b_token = create_access_token({"sub": "+919999900000", "role": "customer", "phone": "+919999900000"})

    # Vendor creates a finalized bill for Customer 1 (+919888877777)
    bill_payload = {
        "customer_name": "Rahul Sharma",
        "customer_phone": "+919888877777",
        "customer_address": "Baner, Pune",
        "bill_type": "invoice",
        "status": "finalized",
        "items": [
            {
                "product_name": "Wagh Bakri Tea 500g",
                "qty": 2.0,
                "unit": "packet",
                "unit_price": 280.0,
                "barcode": "8901030383458"
            }
        ],
        "discount": 0.0,
        "tax_rate": 5.0,
        "payment_status": "paid",
        "payment_method": "UPI",
        "amount_paid": 588.0
    }
    res_create = client.post("/api/vendor/bills", json=bill_payload, headers={"Authorization": f"Bearer {vendor_token}"})
    assert res_create.status_code == 200
    bill_data = res_create.json()["bill"]
    bill_id = bill_data["id"]
    access_token = bill_data["access_token"]

    # 1. Customer 1 lists their bills
    res_cust = client.get("/api/customer/bills", headers={"Authorization": f"Bearer {cust_token}"})
    assert res_cust.status_code == 200
    cust_bills = res_cust.json()["bills"]
    assert any(b["id"] == bill_id for b in cust_bills)

    # 2. Customer B lists bills: Customer B must NOT see Customer 1's bill
    res_cust_b = client.get("/api/customer/bills", headers={"Authorization": f"Bearer {cust_b_token}"})
    assert res_cust_b.status_code == 200
    assert not any(b["id"] == bill_id for b in res_cust_b.json()["bills"])

    # 3. PDF download with access token (SMS/WhatsApp direct link)
    res_pdf_token = client.get(f"/api/bills/{bill_id}/pdf?token={access_token}")
    assert res_pdf_token.status_code == 200
    assert res_pdf_token.headers["content-type"] == "application/pdf"
    assert len(res_pdf_token.content) > 1000

    # 4. PDF download with customer auth header
    res_pdf_auth = client.get(f"/api/bills/{bill_id}/pdf", headers={"Authorization": f"Bearer {cust_token}"})
    assert res_pdf_auth.status_code == 200
    assert res_pdf_auth.headers["content-type"] == "application/pdf"

    # 5. Unauthorized access without token or wrong customer should be 403 Forbidden
    res_unauth = client.get(f"/api/bills/{bill_id}/pdf", headers={"Authorization": f"Bearer {cust_b_token}"})
    assert res_unauth.status_code == 403
