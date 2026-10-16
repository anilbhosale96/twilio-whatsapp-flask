import os
import sys
import uuid
from datetime import timedelta

# Add backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from app.core.database import SessionLocal, Base, engine
from app.core.time_utils import get_ist_now
from app.models.vendor import Vendor
from app.models.item import Item
from app.models.transaction import Transaction
from app.services.chat_preview import chat_preview_manager

def seed_database():
    print("🚀 Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        demo_phone = "whatsapp:+919876543210"
        
        # 1. Clean existing records for clean demo
        db.query(Transaction).filter_by(vendor=demo_phone).delete()
        db.query(Item).filter_by(vendor=demo_phone).delete()
        db.query(Vendor).filter_by(phone=demo_phone).delete()
        db.commit()

        # 2. Create Vendor
        print("👤 Creating demo vendor: Sharma Kirana Store...")
        vendor = Vendor(
            phone=demo_phone,
            name="Sharma Kirana & General Store",
            default_threshold=5.0,
            language="en",
            created_at=get_ist_now() - timedelta(days=45)
        )
        db.add(vendor)
        db.commit()

        # 3. Seed Items
        # Realistic Indian Kirana Items
        demo_items_data = [
            # Name, Unit, Qty, Threshold, Price, Reordered
            ("rice", "kg", 85.0, 15.0, 60.0, False),
            ("oil", "l", 42.0, 10.0, 140.0, False),
            ("sugar", "kg", 4.0, 10.0, 44.0, False),        # Low stock!
            ("bread", "pcs", 3.0, 6.0, 25.0, True),          # Low stock, reordered
            ("atta", "kg", 120.0, 20.0, 42.0, False),
            ("milk", "packet", 18.0, 10.0, 32.0, False),
            ("biscuit", "packet", 45.0, 15.0, 15.0, False),
            ("egg", "dozen", 2.0, 5.0, 84.0, False),         # Low stock!
            ("soap", "box", 24.0, 8.0, 38.0, False),
            ("maggi", "packet", 65.0, 20.0, 14.0, False),
            ("tea", "packet", 28.0, 8.0, 110.0, False),
            ("toor dal", "kg", 35.0, 10.0, 160.0, False),
            ("butter", "g", 500.0, 200.0, 0.6, False),
            ("chips", "packet", 40.0, 15.0, 20.0, False),
            ("onion", "kg", 0.0, 10.0, 35.0, False),         # Out of stock!
            ("potato", "kg", -2.0, 10.0, 30.0, False),       # Negative stock alert!
        ]

        print("📦 Seeding 16 realistic inventory items...")
        for name, unit, qty, thresh, price, reord in demo_items_data:
            item = Item(
                vendor=demo_phone,
                name=name,
                unit=unit,
                qty=qty,
                threshold=thresh,
                price=price,
                reordered=reord,
                updated_at=get_ist_now() - timedelta(hours=2)
            )
            db.add(item)
        db.commit()

        # 4. Seed Transactions (over last 7 days + today)
        print("📝 Seeding transaction history...")
        now = get_ist_now()
        sample_transactions = [
            # Days ago, Item, Unit, Change, Price, Raw Text, Undone
            (6, "rice", "kg", 100.0, 60.0, "Added 100kg rice", False),
            (5, "rice", "kg", -10.0, 60.0, "sold 10kg rice @60", False),
            (5, "oil", "l", 50.0, 140.0, "Added 50L oil", False),
            (4, "oil", "l", -5.0, 140.0, "sold 5L oil @140", False),
            (3, "atta", "kg", 150.0, 42.0, "150kg atta aaya", False),
            (3, "atta", "kg", -20.0, 42.0, "becha 20kg atta @42", False),
            (2, "bread", "pcs", 20.0, 25.0, "Added 20 bread", False),
            (2, "bread", "pcs", -10.0, 25.0, "sold 10 bread @25", False),
            (1, "maggi", "packet", 100.0, 14.0, "Added 100 packet maggi", False),
            (1, "maggi", "packet", -25.0, 14.0, "sold 25 packet maggi @14", False),
            (0, "milk", "packet", 30.0, 32.0, "30 packet doodh laya", False),
            (0, "milk", "packet", -12.0, 32.0, "sold 12 packet milk @32", False),
            (0, "bread", "pcs", -7.0, 25.0, "sold 7 bread @25", False),
            (0, "biscuit", "packet", -15.0, 15.0, "sold 15 packet biscuit @15", False),
            (0, "tea", "packet", -4.0, 110.0, "sold 4 packet tea @110", False),
            (0, "potato", "kg", -12.0, 30.0, "sold 12kg aloo @30", False),
        ]

        for days_ago, item_name, unit, change, price, raw_text, undone in sample_transactions:
            batch_id = str(uuid.uuid4())
            tx_time = now - timedelta(days=days_ago, hours=2)
            tx = Transaction(
                batch_id=batch_id,
                vendor=demo_phone,
                item_name=item_name,
                unit=unit,
                change=change,
                price=price,
                raw_text=raw_text,
                created_at=tx_time,
                undone=undone
            )
            db.add(tx)
        db.commit()

        # 5. Populate Chat Preview messages
        print("💬 Seeding recent chat interactions...")
        chat_preview_manager.add_message(
            phone=demo_phone,
            incoming_text="sold 7 bread @25, 12 packet milk @32",
            reply_text="• Sold 7 pcs bread @ Rs. 25 (Stock: 3 pcs)\n• Sold 12 packet milk @ Rs. 32 (Stock: 18 packet)\n\n⚠️ Low stock: bread has only 3 pcs left (Alert level: 6 pcs)",
            is_voice=False,
            parsed_items=[
                {"action": "SELL", "item": "bread", "qty": 7, "unit": "pcs", "price": 25},
                {"action": "SELL", "item": "milk", "qty": 12, "unit": "packet", "price": 32}
            ]
        )
        chat_preview_manager.add_message(
            phone=demo_phone,
            incoming_text="Added 50L oil, 100kg rice",
            reply_text="• Added 50 l oil (Stock: 42 l)\n• Added 100 kg rice (Stock: 85 kg)",
            is_voice=False,
            parsed_items=[
                {"action": "ADD", "item": "oil", "qty": 50, "unit": "l", "price": None},
                {"action": "ADD", "item": "rice", "qty": 100, "unit": "kg", "price": None}
            ]
        )

        print("✅ Demo data seeded successfully!")
        print(f"Vendor: {demo_phone}")
        print("Run frontend to view the dashboard live.")

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
