import pytest
from sqlalchemy.orm import Session
from app.services.inventory_service import process_incoming_message
from app.models.item import Item
from app.models.transaction import Transaction

def test_sold_2_bread_acceptance_criteria(db_session: Session):
    vendor = "whatsapp:+919876543210"
    
    # First add bread
    reply_add = process_incoming_message(db_session, vendor, "Added 10 bread")
    assert "Added 10 pcs bread" in reply_add

    # Now sell 2 bread
    reply_sell = process_incoming_message(db_session, vendor, "sold 2 bread")
    assert "Sold 2 pcs bread" in reply_sell
    assert "Stock: 8 pcs" in reply_sell

    # Verify database state
    item = db_session.query(Item).filter_by(vendor=vendor, name="bread").first()
    assert item is not None
    assert item.qty == 8.0
    assert item.unit == "pcs"

def test_multi_item_add_and_undo(db_session: Session):
    vendor = "whatsapp:+919876543210"
    
    # Add multiple items in one message
    reply = process_incoming_message(db_session, vendor, "Added 10kg rice, 5L oil")
    assert "Added 10 kg rice" in reply
    assert "Added 5 l oil" in reply

    rice = db_session.query(Item).filter_by(vendor=vendor, name="rice").first()
    oil = db_session.query(Item).filter_by(vendor=vendor, name="oil").first()
    assert rice.qty == 10.0
    assert oil.qty == 5.0

    # Undo
    reply_undo = process_incoming_message(db_session, vendor, "undo")
    assert "Undone last transaction" in reply_undo
    assert "10 kg rice (subtracted)" in reply_undo
    assert "5 l oil (subtracted)" in reply_undo

    # Check reversed quantities
    db_session.refresh(rice)
    db_session.refresh(oil)
    assert rice.qty == 0.0
    assert oil.qty == 0.0

def test_low_and_negative_stock_warnings(db_session: Session):
    vendor = "whatsapp:+919876543210"
    
    # Initial stock: 6 pcs, threshold: 5
    process_incoming_message(db_session, vendor, "Added 6 bread")
    
    # Sell 2 -> qty = 4 <= 5 (Low stock warning)
    reply_low = process_incoming_message(db_session, vendor, "sold 2 bread")
    assert "Low stock: bread has only 4 pcs left" in reply_low

    # Sell 6 more -> qty = -2 (Negative stock warning)
    reply_neg = process_incoming_message(db_session, vendor, "sold 6 bread")
    assert "Warning: bread is in negative stock (-2 pcs)!" in reply_neg

def test_daily_report_and_revenue(db_session: Session):
    vendor = "whatsapp:+919876543210"
    
    # Add stock
    process_incoming_message(db_session, vendor, "Added 20 bread, 10kg rice")
    
    # Sell with prices
    process_incoming_message(db_session, vendor, "sold 2 bread @20")
    process_incoming_message(db_session, vendor, "sold 3kg rice @60")

    # Ask for report
    report = process_incoming_message(db_session, vendor, "report")
    assert "Today's Sales Report" in report
    assert "Rs. 220" in report # 2*20 + 3*60 = 40 + 180 = 220
    assert "Bread: 2 pcs" in report
    assert "Rice: 3 kg" in report

def test_stock_and_low_commands(db_session: Session):
    vendor = "whatsapp:+919876543210"
    process_incoming_message(db_session, vendor, "Added 2 bread, 50kg rice")

    stock_msg = process_incoming_message(db_session, vendor, "stock")
    assert "Current Inventory:" in stock_msg
    assert "Bread: 2 pcs" in stock_msg
    assert "Rice: 50 kg" in stock_msg

    low_msg = process_incoming_message(db_session, vendor, "low")
    assert "Low Stock Items:" in low_msg
    assert "Bread" in low_msg
    assert "Rice" not in low_msg

def test_alert_command_and_help(db_session: Session):
    vendor = "whatsapp:+919876543210"
    process_incoming_message(db_session, vendor, "Added 100kg rice")
    
    # Set alert level
    alert_reply = process_incoming_message(db_session, vendor, "alert rice 25")
    assert "Alert level for *rice* set to 25 kg" in alert_reply

    rice = db_session.query(Item).filter_by(vendor=vendor, name="rice").first()
    assert rice.threshold == 25.0

    # Help
    help_reply = process_incoming_message(db_session, vendor, "help")
    assert "Smart Stack AI Commands & Help" in help_reply

