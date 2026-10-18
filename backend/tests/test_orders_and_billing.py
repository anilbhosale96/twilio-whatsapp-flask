import io
import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.vendor import Vendor
from app.models.customer import Customer
from app.models.item import Item
from app.models.order import Order, OrderItem
from app.models.bill import Bill
from app.core.auth_security import hash_password
from app.services.pdf_generator import calculate_bill_totals

@pytest.fixture
def setup_test_data(db_session: Session):
    # Vendor 1
    v1 = Vendor(
        phone="whatsapp:+919876543210",
        name="Rajesh Sharma",
        shop_name="Sharma Kirana & General Store",
        category="Grocery",
        password_hash=hash_password("password123"),
        gstin="27AAAAA0000A1Z5"
    )
    # Vendor 2 (for tenant isolation tests)
    v2 = Vendor(
        phone="whatsapp:+919811122233",
        name="Vikas Gupta",
        shop_name="Gupta Medicals",
        category="Pharmacy",
        password_hash=hash_password("password123")
    )
    # Customer 1
    c1 = Customer(
        phone="whatsapp:+919999988888",
        name="Amit Verma",
        city="Pune",
        address="Flat 402, Shivajinagar, Pune",
        password_hash=hash_password("password123")
    )
    # Customer 2
    c2 = Customer(
        phone="whatsapp:+919777766666",
        name="Priya Nair",
        city="Mumbai",
        address="Bandra West, Mumbai",
        password_hash=hash_password("password123")
    )
    db_session.add_all([v1, v2, c1, c2])
    db_session.commit()

    # Vendor 1 items
    i1 = Item(vendor=v1.phone, name="Parle G Biscuits", qty=100, unit="pack", price=10.0, category="Grocery", is_public=True)
    i2 = Item(vendor=v1.phone, name="Tata Salt 1kg", qty=50, unit="kg", price=28.0, category="Grocery", is_public=True)
    i3 = Item(vendor=v1.phone, name="Special Basmati Rice", qty=20, unit="kg", price=None, category="Grocery", is_public=True) # Unpriced
    db_session.add_all([i1, i2, i3])
    db_session.commit()

    return {
        "v1": v1,
        "v2": v2,
        "c1": c1,
        "c2": c2,
        "item_parle": i1,
        "item_salt": i2,
        "item_rice": i3
    }

def get_auth_token(client: TestClient, phone: str, role: str = "customer") -> str:
    endpoint = "/api/auth/customer/login" if role == "customer" else "/api/auth/login"
    res = client.post(endpoint, json={"phone": phone, "password": "password123"})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]

def test_decimal_safe_bill_calculation():
    items = [
        {"product_name": "Parle G", "qty": 3, "unit_price": 10.0},
        {"product_name": "Tata Salt", "qty": 2.5, "unit_price": 28.0},
    ]
    # Subtotal = 30.0 + 70.0 = 100.0
    calc = calculate_bill_totals(
        items=items,
        discount_val=10.0,  # 100 - 10 = 90.0 taxable
        tax_rate_val=5.0,   # 5% of 90 = 4.50 (CGST 2.25, SGST 2.25)
        delivery_charge_val=30.0 # 90 + 4.5 + 30 = 124.50
    )
    assert calc["subtotal"] == 100.0
    assert calc["discount"] == 10.0
    assert calc["taxable_amount"] == 90.0
    assert calc["total_tax"] == 4.5
    assert calc["cgst"] == 2.25
    assert calc["sgst"] == 2.25
    assert calc["delivery_charge"] == 30.0
    assert calc["final_total"] == 124.5

def test_customer_cart_order_and_vendor_isolation(client: TestClient, setup_test_data):
    c1_token = get_auth_token(client, setup_test_data["c1"].phone, role="customer")
    v1_token = get_auth_token(client, setup_test_data["v1"].phone, role="vendor")
    v2_token = get_auth_token(client, setup_test_data["v2"].phone, role="vendor")

    # 1. Customer places cart order
    order_res = client.post(
        "/api/customer/orders",
        headers={"Authorization": f"Bearer {c1_token}"},
        json={
            "vendor_phone": setup_test_data["v1"].phone,
            "request_type": "cart",
            "items": [
                {"product_name": "Parle G Biscuits", "qty": 5, "unit": "pack", "unit_price": 10.0},
                {"product_name": "Tata Salt 1kg", "qty": 2, "unit": "kg", "unit_price": 28.0}
            ],
            "notes": "Please deliver in the evening."
        }
    )
    assert order_res.status_code == 200, order_res.text
    order_data = order_res.json()["order"]
    assert order_data["status"] == "New"
    assert order_data["subtotal"] == 106.0 # 5*10 + 2*28 = 106
    order_id = order_data["id"]

    # 2. Vendor 1 sees the order in incoming workspace
    v1_orders_res = client.get("/api/vendor/orders", headers={"Authorization": f"Bearer {v1_token}"})
    assert v1_orders_res.status_code == 200
    v1_orders = v1_orders_res.json()["orders"]
    assert any(o["id"] == order_id for o in v1_orders)

    # 3. Tenant Isolation: Vendor 2 MUST NOT see Vendor 1's order
    v2_orders_res = client.get("/api/vendor/orders", headers={"Authorization": f"Bearer {v2_token}"})
    assert v2_orders_res.status_code == 200
    v2_orders = v2_orders_res.json()["orders"]
    assert not any(o["id"] == order_id for o in v2_orders)

    # 4. Vendor 2 cannot access Vendor 1's order details directly
    v2_detail = client.get(f"/api/vendor/orders/{order_id}", headers={"Authorization": f"Bearer {v2_token}"})
    assert v2_detail.status_code == 404

def test_missing_price_quotation_and_approval_flow(client: TestClient, setup_test_data, db_session: Session):
    c1_token = get_auth_token(client, setup_test_data["c1"].phone, role="customer")
    v1_token = get_auth_token(client, setup_test_data["v1"].phone, role="vendor")

    # 1. Customer places order with an unpriced item
    order_res = client.post(
        "/api/customer/orders",
        headers={"Authorization": f"Bearer {c1_token}"},
        json={
            "vendor_phone": setup_test_data["v1"].phone,
            "request_type": "custom_text",
            "raw_text": "2kg Special Basmati Rice aur 1 Parle G"
        }
    )
    assert order_res.status_code == 200
    order_data = order_res.json()["order"]
    order_id = order_data["id"]

    # Status should be Awaiting Price because Rice was unpriced in vendor inventory
    assert order_data["status"] == "Awaiting Price"

    # 2. Vendor reviews and updates the prices
    update_items_res = client.put(
        f"/api/vendor/orders/{order_id}/items",
        headers={"Authorization": f"Bearer {v1_token}"},
        json={
            "items": [
                {"product_name": "Special Basmati Rice", "qty": 2.0, "unit": "kg", "unit_price": 95.0},
                {"product_name": "Parle G Biscuits", "qty": 1.0, "unit": "pack", "unit_price": 10.0}
            ],
            "notes": "Best quality Dehradun Basmati"
        }
    )
    assert update_items_res.status_code == 200
    updated_order = update_items_res.json()["order"]
    assert updated_order["subtotal"] == 200.0 # 2*95 + 10 = 200

    # 3. Vendor sends formal quotation to customer
    quote_res = client.post(
        f"/api/vendor/orders/{order_id}/send-quote",
        headers={"Authorization": f"Bearer {v1_token}"},
        json={
            "discount": 10.0,
            "tax_rate": 5.0,
            "delivery_charge": 20.0
        }
    )
    assert quote_res.status_code == 200
    quote_data = quote_res.json()
    assert quote_data["order"]["status"] == "Quote Sent"
    assert "QTE-" in quote_data["bill_number"]

    # 4. Customer views the quote in customer portal
    cust_view_res = client.get(f"/api/customer/orders/{order_id}", headers={"Authorization": f"Bearer {c1_token}"})
    assert cust_view_res.status_code == 200
    cust_order = cust_view_res.json()["order"]
    assert cust_order["status"] == "Quote Sent"
    assert len(cust_order["bills"]) >= 1

    # Check stock before approval (Rice qty = 20)
    rice_before = db_session.query(Item).filter_by(name="Special Basmati Rice", vendor=setup_test_data["v1"].phone).first()
    assert rice_before.qty == 20.0

    # 5. Customer approves quotation -> Confirms order and triggers atomic stock deduction
    approve_res = client.post(
        f"/api/customer/orders/{order_id}/approve",
        headers={"Authorization": f"Bearer {c1_token}"}
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["order"]["status"] == "Confirmed"

    # Verify inventory was deducted: 20 - 2 = 18
    db_session.expire_all()
    rice_after = db_session.query(Item).filter_by(name="Special Basmati Rice", vendor=setup_test_data["v1"].phone).first()
    assert rice_after.qty == 18.0

    # 6. Vendor generates final invoice and marks paid
    bill_res = client.post(
        f"/api/vendor/orders/{order_id}/generate-bill",
        headers={"Authorization": f"Bearer {v1_token}"},
        json={
            "bill_type": "invoice",
            "discount": 10.0,
            "tax_rate": 5.0,
            "delivery_charge": 20.0
        }
    )
    assert bill_res.status_code == 200
    assert "INV-" in bill_res.json()["bill_number"]

    # 7. Customer downloads PDF
    pdf_res = client.get(f"/api/orders/{order_id}/download-pdf", headers={"Authorization": f"Bearer {c1_token}"})
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 1000  # Valid non-empty PDF binary

    # 8. Unauthorized user (Customer 2) cannot download Customer 1's PDF
    c2_token = get_auth_token(client, setup_test_data["c2"].phone, role="customer")
    unauth_res = client.get(f"/api/orders/{order_id}/download-pdf", headers={"Authorization": f"Bearer {c2_token}"})
    assert unauth_res.status_code == 403

def test_order_image_upload_and_security(client: TestClient, setup_test_data):
    c1_token = get_auth_token(client, setup_test_data["c1"].phone, role="customer")
    v1_token = get_auth_token(client, setup_test_data["v1"].phone, role="vendor")
    c2_token = get_auth_token(client, setup_test_data["c2"].phone, role="customer")

    # Create dummy image bytes
    dummy_img = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"

    order_payload = {
        "vendor_phone": setup_test_data["v1"].phone,
        "request_type": "image_list",
        "notes": "Handwritten shopping list attached"
    }

    res = client.post(
        "/api/customer/orders",
        headers={"Authorization": f"Bearer {c1_token}"},
        data={"order_data": json.dumps(order_payload)},
        files={"file": ("shopping_list.png", dummy_img, "image/png")}
    )
    assert res.status_code == 200, res.text
    order_id = res.json()["order"]["id"]
    assert res.json()["order"]["has_image"] is True

    # Vendor 1 can view uploaded image
    img_res = client.get(f"/api/orders/{order_id}/image", headers={"Authorization": f"Bearer {v1_token}"})
    assert img_res.status_code == 200
    assert img_res.headers["content-type"] == "image/png"

    # Customer 1 can view their own image
    cust_img_res = client.get(f"/api/orders/{order_id}/image", headers={"Authorization": f"Bearer {c1_token}"})
    assert cust_img_res.status_code == 200

    # Customer 2 (unrelated) receives 403 Forbidden
    forbidden_res = client.get(f"/api/orders/{order_id}/image", headers={"Authorization": f"Bearer {c2_token}"})
    assert forbidden_res.status_code == 403
