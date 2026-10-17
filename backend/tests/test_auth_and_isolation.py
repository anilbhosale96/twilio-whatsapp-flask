import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.vendor import Vendor
from app.models.item import Item
from app.models.transaction import Transaction
from app.core.auth_security import hash_password

def test_auth_registration_and_login_flow(client: TestClient, db_session: Session):
    # 1. Register a new shop: "Gupta General Store"
    reg_payload = {
        "phone": "+91 91234 56789",
        "password": "securepassword123",
        "owner_name": "Amit Gupta",
        "shop_name": "Gupta General Store",
        "category": "Grocery",
        "email": "amit@example.com"
    }
    res_reg = client.post("/api/auth/register", json=reg_payload)
    assert res_reg.status_code == 200, res_reg.text
    data = res_reg.json()
    assert data["status"] == "success"
    assert "access_token" in data
    assert data["vendor"]["shop_name"] == "Gupta General Store"
    token_gupta = data["access_token"]

    # 2. Duplicate registration should be blocked (400)
    res_dup = client.post("/api/auth/register", json=reg_payload)
    assert res_dup.status_code == 400

    # 3. Login with wrong password should fail (401)
    res_bad_login = client.post("/api/auth/login", json={
        "phone": "+91 91234 56789",
        "password": "wrongpassword"
    })
    assert res_bad_login.status_code == 401

    # 4. Login with correct password should succeed (200)
    res_login = client.post("/api/auth/login", json={
        "phone": "+91 91234 56789",
        "password": "securepassword123"
    })
    assert res_login.status_code == 200
    login_data = res_login.json()
    assert "access_token" in login_data
    assert login_data["vendor"]["name"] == "Amit Gupta"

    # 5. Access /api/auth/me with Bearer token
    res_me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_gupta}"})
    assert res_me.status_code == 200
    assert res_me.json()["shop_name"] == "Gupta General Store"

def test_multi_tenant_shop_isolation(client: TestClient, db_session: Session):
    # Setup Shop 1: Sharma Kirana
    shop1_phone = "whatsapp:+919876543210"
    v1 = Vendor(
        phone=shop1_phone,
        name="Rajesh Sharma",
        shop_name="Sharma Kirana",
        password_hash=hash_password("password123")
    )
    db_session.add(v1)
    i1 = Item(vendor=shop1_phone, name="special_sharma_spice", unit="kg", qty=50.0, threshold=5.0, price=200.0)
    db_session.add(i1)
    db_session.commit()
    db_session.refresh(i1)
    sharma_item_id = i1.id

    # Setup Shop 2: Verma Medical
    res_reg2 = client.post("/api/auth/register", json={
        "phone": "+91 98888 77777",
        "password": "medicalpassword",
        "owner_name": "Dr. Verma",
        "shop_name": "Verma Medical Store",
        "category": "Pharmacy"
    })
    assert res_reg2.status_code == 200
    token_verma = res_reg2.json()["access_token"]

    # 1. Verma logs in and queries /api/inventory
    res_verma_inv = client.get(
        "/api/inventory",
        headers={"Authorization": f"Bearer {token_verma}"}
    )
    assert res_verma_inv.status_code == 200
    verma_items = res_verma_inv.json()
    verma_item_names = [it["name"] for it in verma_items]

    # Verify Verma CANNOT see Sharma's spice!
    assert "special_sharma_spice" not in verma_item_names

    # 2. Verma tries to directly modify Sharma's item by item ID
    res_hack = client.patch(
        f"/api/inventory/{sharma_item_id}",
        json={"qty": 999.0},
        headers={"Authorization": f"Bearer {token_verma}"}
    )
    # MUST return 404 (Item not found in your shop)
    assert res_hack.status_code == 404

    # Verify Sharma's item was NOT modified
    db_session.refresh(i1)
    assert i1.qty == 50.0

    # 3. Login as Sharma and verify Sharma sees their item
    res_login_sharma = client.post("/api/auth/login", json={
        "phone": "+91 98765 43210",
        "password": "password123"
    })
    assert res_login_sharma.status_code == 200
    token_sharma = res_login_sharma.json()["access_token"]

    res_sharma_inv = client.get(
        "/api/inventory",
        headers={"Authorization": f"Bearer {token_sharma}"}
    )
    assert res_sharma_inv.status_code == 200
    sharma_item_names = [it["name"] for it in res_sharma_inv.json()]
    assert "special_sharma_spice" in sharma_item_names


def test_new_registered_account_starts_with_zero_inventory_and_clean_reports(client: TestClient, db_session: Session):
    # 1. Register a brand new vendor account
    res_reg = client.post("/api/auth/register", json={
        "phone": "+91 99999 00000",
        "password": "brandnewpassword123",
        "owner_name": "New Owner",
        "shop_name": "Zero Mart Store",
        "category": "Retail"
    })
    assert res_reg.status_code == 200
    token = res_reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Verify /api/inventory is completely empty (zero items)
    res_inv = client.get("/api/inventory", headers=headers)
    assert res_inv.status_code == 200
    inv = res_inv.json()
    assert len(inv) == 0, f"Expected 0 items for new account, got {len(inv)}"

    # 3. Verify /api/summary has 0 items
    res_summary = client.get("/api/summary", headers=headers)
    assert res_summary.status_code == 200
    summary = res_summary.json()
    assert summary["total_items"] == 0
    assert summary["sales_today_units"] == 0
    assert summary["alerts_count"] == 0

    # 4. Verify /api/transactions has 0 transactions
    res_tx = client.get("/api/transactions", headers=headers)
    assert res_tx.status_code == 200
    txs = res_tx.json()["items"]
    assert len(txs) == 0

    # 5. Verify /api/reports for today, 7d, 30d
    for r, expected_buckets in [("today", 1), ("7d", 7), ("30d", 30)]:
        res_rep = client.get(f"/api/reports?range={r}", headers=headers)
        assert res_rep.status_code == 200, res_rep.text
        rep = res_rep.json()
        assert rep["range"] == r
        assert rep["total_units_sold"] == 0
        assert rep["total_stock_in_units"] == 0
        assert rep["total_revenue"] == 0.0
        assert rep["item_count"] == 0
        assert len(rep["items"]) == 0
        assert len(rep["daily_movement"]) == expected_buckets
        for b in rep["daily_movement"]:
            assert b["stock_in"] == 0
            assert b["stock_out"] == 0

