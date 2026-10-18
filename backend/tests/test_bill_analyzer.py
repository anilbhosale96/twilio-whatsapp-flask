import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.item import Item
from app.models.transaction import Transaction

def test_analyze_bill_received_text(client: TestClient):
    sample_text = """
    PURCHASE INVOICE
    Supplier: Mahavir Provisions
    -------------------------------------------
    1. Parle G 100g         20 pkts   10.00   200.00
    2. Tata Salt 1kg        15 pkts   28.00   420.00
    3. Fortune Oil 1L       10 pcs    140.00  1400.00
    -------------------------------------------
    Total Amount: 2020.00
    """
    response = client.post("/api/analyze-bill", json={"text": sample_text})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["bill_type"] == "received"
    assert data["total_items"] == 3
    assert data["total_amount"] == 2020.0
    names = [it["name"].lower() for it in data["items"]]
    assert any("parle g" in n for n in names)
    assert any("tata salt" in n for n in names)
    assert any("fortune oil" in n for n in names)

def test_analyze_bill_sold_text(client: TestClient):
    sample_text = """
    RETAIL SALES BILL
    Cash Memo #409
    5 packet Parle G @ 10
    2 packet Tata Salt @ 28
    """
    response = client.post("/api/analyze-bill", json={"text": sample_text, "bill_type": "sold"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["bill_type"] == "sold"
    assert len(data["items"]) >= 2
    for item in data["items"]:
        assert item["action"] == "SELL"

def test_apply_bill_to_inventory(client: TestClient, db_session: Session):
    vendor = "whatsapp:+919876543210"
    payload = {
        "bill_type": "received",
        "bill_reference": "Inv #998",
        "vendor": vendor,
        "items": [
            {"name": "test bill biscuit", "qty": 30.0, "unit": "pcs", "price": 10.0, "action": "ADD"}
        ]
    }
    response = client.post("/api/apply-bill", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["applied_items"]) == 1

    item = db_session.query(Item).filter_by(vendor=vendor, name="test bill biscuit").first()
    assert item is not None
    assert item.qty >= 30.0

    tx = db_session.query(Transaction).filter_by(vendor=vendor, item_name="test bill biscuit").first()
    assert tx is not None
    assert "[Bill Received" in tx.raw_text
