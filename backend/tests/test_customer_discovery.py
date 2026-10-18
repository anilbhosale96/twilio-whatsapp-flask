import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.vendor import Vendor
from app.models.item import Item
from app.core.security import hash_password

def test_customer_registration_and_login(client: TestClient):
    # 1. Register customer
    reg_res = client.post("/api/auth/customer/register", json={
        "phone": "+919876500001",
        "password": "customerpass123",
        "name": "Aarav Patil",
        "city": "Pune",
        "email": "aarav@example.com",
        "address": "Kothrud, Pune"
    })
    assert reg_res.status_code == 200, reg_res.text
    reg_data = reg_res.json()
    assert reg_data["user"]["role"] == "customer"
    assert reg_data["user"]["name"] == "Aarav Patil"
    assert "access_token" in reg_data

    # 2. Duplicate registration should fail
    dup_res = client.post("/api/auth/customer/register", json={
        "phone": "+919876500001",
        "password": "customerpass123",
        "name": "Duplicate Aarav"
    })
    assert dup_res.status_code == 400

    # 3. Customer login
    login_res = client.post("/api/auth/customer/login", json={
        "phone": "+919876500001",
        "password": "customerpass123"
    })
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data["user"]["role"] == "customer"
    assert "access_token" in login_data

    # 4. Get customer profile
    token = login_data["access_token"]
    me_res = client.get("/api/auth/customer/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert "9876500001" in me_res.json()["phone"]
    assert me_res.json()["role"] == "customer"

def test_customer_role_restrictions_on_vendor_apis(client: TestClient):
    # Register customer
    reg_res = client.post("/api/auth/customer/register", json={
        "phone": "+919876500002",
        "password": "customerpass123",
        "name": "Neha Sharma"
    })
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Customers must be forbidden (403) from accessing vendor operations
    inv_res = client.get("/api/inventory", headers=headers)
    assert inv_res.status_code == 403
    assert "Customer accounts cannot access vendor management" in inv_res.json()["detail"]

    add_res = client.post("/api/inventory", headers=headers, json={
        "name": "Hacked Item",
        "qty": 100,
        "unit": "pcs",
        "price": 50
    })
    assert add_res.status_code == 403

    alerts_res = client.get("/api/alerts", headers=headers)
    assert alerts_res.status_code == 403

    summary_res = client.get("/api/summary", headers=headers)
    assert summary_res.status_code == 403

    reports_res = client.get("/api/reports", headers=headers)
    assert reports_res.status_code == 403

def test_multi_vendor_product_discovery(client: TestClient, db_session: Session):
    # Setup two distinct vendors
    v1 = Vendor(
        phone="whatsapp:+919800000001",
        name="Rajesh Sharma",
        shop_name="Sharma Kirana",
        category="Grocery",
        password_hash=hash_password("password123")
    )
    v2 = Vendor(
        phone="whatsapp:+919800000002",
        name="Sunil Gupta",
        shop_name="Gupta Medicals",
        category="Pharmacy",
        password_hash=hash_password("password123")
    )
    db_session.add_all([v1, v2])
    db_session.commit()

    # Add items to v1 (Grocery)
    item1 = Item(vendor=v1.phone, name="Parle G Biscuits", qty=50, unit="pack", price=10.0, category="Grocery", is_public=True)
    item2 = Item(vendor=v1.phone, name="Tata Salt 1kg", qty=0, unit="kg", price=28.0, category="Grocery", is_public=True) # Out of stock
    # Add items to v2 (Pharmacy)
    item3 = Item(vendor=v2.phone, name="Crocin Advance 500mg", qty=100, unit="strip", price=32.0, category="Pharmacy", is_public=True)
    item4 = Item(vendor=v2.phone, name="Dettol Antiseptic Liquid", qty=15, unit="bottle", price=85.0, category="Pharmacy", is_public=True)
    db_session.add_all([item1, item2, item3, item4])
    db_session.commit()

    # 1. Discover all products across both vendors
    res = client.get("/api/products")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 4
    assert len(data["products"]) == 4

    # Verify multi-vendor store info is included
    shop_names = {p["store"]["name"] for p in data["products"]}
    assert "Sharma Kirana" in shop_names
    assert "Gupta Medicals" in shop_names

    # 2. Filter by category
    pharmacy_res = client.get("/api/products?category=Pharmacy")
    assert pharmacy_res.status_code == 200
    p_data = pharmacy_res.json()
    assert p_data["total"] == 2
    for p in p_data["products"]:
        assert p["category"] == "Pharmacy"

    # 3. Filter by search query
    query_res = client.get("/api/products?q=Parle")
    assert query_res.status_code == 200
    q_data = query_res.json()
    assert q_data["total"] == 1
    assert "Parle G" in q_data["products"][0]["name"]

    # 4. Filter in-stock only
    instock_res = client.get("/api/products?in_stock_only=true")
    assert instock_res.status_code == 200
    in_data = instock_res.json()
    assert in_data["total"] == 3 # item2 (Tata Salt) is qty=0 so excluded
    names = [p["name"] for p in in_data["products"]]
    assert "Tata Salt 1kg" not in names

    # 5. Check out-of-stock badge when in_stock_only=false
    all_res = client.get("/api/products?in_stock_only=false")
    tata_salt = next(p for p in all_res.json()["products"] if "Tata Salt" in p["name"])
    assert tata_salt["is_in_stock"] is False
    assert tata_salt["stock_status"] == "out_of_stock"

    # 6. Categories aggregation endpoint
    cats_res = client.get("/api/products/categories")
    assert cats_res.status_code == 200
    cats_data = cats_res.json()["categories"]
    cats_dict = {c["id"]: c["count"] for c in cats_data}
    assert cats_dict.get("Grocery") == 2
    assert cats_dict.get("Pharmacy") == 2
