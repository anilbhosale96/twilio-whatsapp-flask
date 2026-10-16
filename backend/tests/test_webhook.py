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

