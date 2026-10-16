import uuid
from sqlalchemy.orm import Session
from app.models.vendor import Vendor
from app.models.item import Item
from app.models.transaction import Transaction

def test_create_vendor_and_items(db_session: Session):
    vendor = Vendor(
        phone="whatsapp:+919876543210",
        name="Sharma Kirana Store",
        default_threshold=5.0,
        language="hi"
    )
    db_session.add(vendor)
    db_session.commit()

    saved_vendor = db_session.query(Vendor).filter_by(phone="whatsapp:+919876543210").first()
    assert saved_vendor is not None
    assert saved_vendor.name == "Sharma Kirana Store"
    assert saved_vendor.default_threshold == 5.0
    assert saved_vendor.language == "hi"

    # Add items
    item1 = Item(
        vendor=vendor.phone,
        name="rice",
        unit="kg",
        qty=50.0,
        threshold=10.0,
        price=60.0
    )
    db_session.add(item1)
    db_session.commit()

    saved_item = db_session.query(Item).filter_by(vendor=vendor.phone, name="rice").first()
    assert saved_item is not None
    assert saved_item.qty == 50.0
    assert saved_item.unit == "kg"
    assert saved_item.reordered is False

    # Add transaction
    batch_id = str(uuid.uuid4())
    tx = Transaction(
        batch_id=batch_id,
        vendor=vendor.phone,
        item_name="rice",
        unit="kg",
        change=50.0,
        price=60.0,
        raw_text="Added 50kg rice @60",
        undone=False
    )
    db_session.add(tx)
    db_session.commit()

    saved_tx = db_session.query(Transaction).filter_by(batch_id=batch_id).first()
    assert saved_tx is not None
    assert saved_tx.change == 50.0
    assert saved_tx.undone is False

