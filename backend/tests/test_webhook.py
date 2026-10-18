import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.item import Item

def test_webhook_added_10kg_rice_acceptance_criteria(client: TestClient, db_session: Session):
    sender = "whatsapp:+919876543210"
    payload = {
        "From": sender,
        "Body": "Added 10kg rice",
        "NumMedia": "0"
    }

    response = client.post("/webhook", data=payload)
    assert response.status_code == 200
    assert "application/xml" in response.headers["content-type"]
    
    xml_text = response.text
    assert "<Response>" in xml_text
    assert "<Message>" in xml_text
    assert "Added 10 kg rice" in xml_text

    # Verify database persistence
    item = db_session.query(Item).filter_by(vendor=sender, name="rice").first()
    assert item is not None
    assert item.qty == 10.0
    assert item.unit == "kg"

def test_webhook_command_help(client: TestClient):
    response = client.post("/webhook", data={"From": "whatsapp:+919876543210", "Body": "help"})
    assert response.status_code == 200
    assert "Smart Stack AI Commands &amp; Help" in response.text or "Smart Stack AI Commands & Help" in response.text


def test_sms_forwarder_webhook(client: TestClient, db_session: Session):
    sender = "whatsapp:+919876543210"
    payload = {
        "from": sender,
        "message": "15 Parle G aaya"
    }
    response = client.post("/api/sms", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "parle g" in data["reply"].lower()

    item = db_session.query(Item).filter_by(vendor=sender, name="parle g").first()
    assert item is not None
    assert item.qty >= 15.0


def test_direct_in_app_message(client: TestClient, db_session: Session):
    sender = "whatsapp:+919876543210"
    payload = {
        "message": "20 Tata Salt aaya",
        "channel": "whatsapp",
        "vendor": sender
    }
    response = client.post("/api/message", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "tata salt" in data["reply"].lower()

    item = db_session.query(Item).filter_by(vendor=sender, name="tata salt").first()
    assert item is not None
    assert item.qty >= 20.0


