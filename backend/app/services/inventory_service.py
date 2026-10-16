import uuid
from datetime import datetime, time
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.vendor import Vendor
from app.models.item import Item
from app.models.transaction import Transaction
from app.parsers.schemas import ParsedAction, ParseResult
from app.parsers.rule_parser import parse_message
from app.core.config import settings
from app.core.time_utils import get_ist_now, IST
from app.core.formatters import format_inr
from app.services.broadcaster import broadcaster

def get_or_create_vendor(db: Session, phone: str) -> Vendor:
    vendor = db.query(Vendor).filter_by(phone=phone).first()
    if not vendor:
        vendor = Vendor(
            phone=phone,
            name=None,
            default_threshold=settings.DEFAULT_THRESHOLD,
            language=settings.DEFAULT_LANGUAGE
        )
        db.add(vendor)
        db.commit()
        db.refresh(vendor)
    return vendor

def apply_changes(
    db: Session,
    vendor_phone: str,
    actions: List[ParsedAction],
    raw_text: str
) -> str:
    vendor = get_or_create_vendor(db, vendor_phone)
    batch_id = str(uuid.uuid4())
    
    reply_lines = []
    alerts = []
    
    # Process all in one transaction
    try:
        for action in actions:
            item = db.query(Item).filter_by(vendor=vendor_phone, name=action.item_name).first()
            if not item:
                # First stored unit always wins
                item = Item(
                    vendor=vendor_phone,
                    name=action.item_name,
                    unit=action.unit,
                    qty=0.0,
                    threshold=vendor.default_threshold,
                    price=action.price,
                    reordered=False
                )
                db.add(item)
                db.flush()
            else:
                if action.price is not None:
                    item.price = action.price
            
            # Compute change
            change = action.quantity if action.action == "ADD" else -action.quantity
            item.qty += change
            item.updated_at = get_ist_now()

            # Create transaction record
            tx = Transaction(
                batch_id=batch_id,
                vendor=vendor_phone,
                item_name=item.name,
                unit=item.unit,
                change=change,
                price=action.price,
                raw_text=raw_text,
                created_at=get_ist_now(),
                undone=False
            )
            db.add(tx)

            # Build reply line
            action_verb = "Added" if action.action == "ADD" else "Sold"
            price_text = f" @ {format_inr(action.price)}" if action.price is not None else ""
            reply_lines.append(f"• {action_verb} {action.quantity:g} {item.unit} {item.name}{price_text} (Stock: {item.qty:g} {item.unit})")

            # Check alerts
            if item.qty < 0:
                alerts.append(f"🚨 Warning: {item.name} is in negative stock ({item.qty:g} {item.unit})!")
            elif item.qty <= item.threshold:
                alerts.append(f"⚠️ Low stock: {item.name} has only {item.qty:g} {item.unit} left (Alert level: {item.threshold:g} {item.unit})")

        db.commit()
    except Exception as e:
        db.rollback()
        raise e

    # Notify real-time listeners
    broadcaster.notify_sync("data_updated", {
        "vendor": vendor_phone,
        "batch_id": batch_id,
        "actions_count": len(actions)
    })

    response_text = "\n".join(reply_lines)
    if alerts:
        response_text += "\n\n" + "\n".join(alerts)
    return response_text

def handle_undo(db: Session, vendor_phone: str) -> str:
    # Find last non-undone batch
    last_tx = (
        db.query(Transaction)
        .filter_by(vendor=vendor_phone, undone=False)
        .order_by(Transaction.id.desc())
        .first()
    )
    if not last_tx:
        return "No recent transaction to undo."

    batch_id = last_tx.batch_id
    batch_txs = (
        db.query(Transaction)
        .filter_by(vendor=vendor_phone, batch_id=batch_id, undone=False)
        .all()
    )

    reverted_items = []
    try:
        for tx in batch_txs:
            item = db.query(Item).filter_by(vendor=vendor_phone, name=tx.item_name).first()
            if item:
                item.qty -= tx.change
                item.updated_at = get_ist_now()
            tx.undone = True
            direction = "subtracted" if tx.change > 0 else "restored"
            reverted_items.append(f"{abs(tx.change):g} {tx.unit} {tx.item_name} ({direction})")

        db.commit()
    except Exception as e:
        db.rollback()
        raise e

    broadcaster.notify_sync("data_updated", {
        "vendor": vendor_phone,
        "batch_id": batch_id,
        "undone": True
    })

    return f"↩️ Undone last transaction:\n• " + "\n• ".join(reverted_items)

def handle_stock(db: Session, vendor_phone: str, low_only: bool = False) -> str:
    query = db.query(Item).filter_by(vendor=vendor_phone)
    if low_only:
        query = query.filter(Item.qty <= Item.threshold)
    
    items = query.order_by(Item.name.asc()).all()

    if not items:
        if low_only:
            return "✅ All items are well stocked! No low stock alerts."
        return "📦 Your inventory is currently empty. Send a message like 'Added 10kg rice, 5L oil' to get started."

    header = "⚠️ *Low Stock Items:*" if low_only else "📦 *Current Inventory:*"
    lines = [header]
    for item in items:
        status = ""
        if item.qty < 0:
            status = " 🚨 (Negative)"
        elif item.qty <= item.threshold:
            status = " ⚠️ (Low)"
        price_info = f" | {format_inr(item.price)}" if item.price else ""
        lines.append(f"• {item.name.capitalize()}: {item.qty:g} {item.unit}{price_info}{status}")
    
    return "\n".join(lines)

def handle_report(db: Session, vendor_phone: str) -> str:
    now_ist = get_ist_now()
    start_of_day = datetime.combine(now_ist.date(), time.min).replace(tzinfo=IST)

    # Fetch all sales transactions for today
    txs = (
        db.query(Transaction)
        .filter(
            Transaction.vendor == vendor_phone,
            Transaction.undone == False,
            Transaction.change < 0,
            Transaction.created_at >= start_of_day
        )
        .all()
    )

    if not txs:
        return "📊 *Today's Sales Report*\nNo sales recorded yet today."

    item_stats = {}
    total_rev = 0.0

    for tx in txs:
        qty_sold = abs(tx.change)
        rev = qty_sold * (tx.price or 0.0)
        total_rev += rev

        if tx.item_name not in item_stats:
            item_stats[tx.item_name] = {"units": 0.0, "unit": tx.unit, "revenue": 0.0}
        item_stats[tx.item_name]["units"] += qty_sold
        item_stats[tx.item_name]["revenue"] += rev

    lines = [
        f"📊 *Today's Sales Report* ({now_ist.strftime('%d %b %Y')})",
        f"Total Revenue: *{format_inr(total_rev)}*",
        "Breakdown:"
    ]
    for name, stat in item_stats.items():
        rev_text = f" = {format_inr(stat['revenue'])}" if stat['revenue'] > 0 else ""
        lines.append(f"• {name.capitalize()}: {stat['units']:g} {stat['unit']}{rev_text}")

    return "\n".join(lines)

def handle_alert_command(db: Session, vendor_phone: str, item_name: str, threshold_str: str) -> str:
    try:
        threshold = float(threshold_str)
    except ValueError:
        return f"Invalid threshold value '{threshold_str}'. Please use a number, e.g. 'alert rice 5'."

    item = db.query(Item).filter_by(vendor=vendor_phone, name=item_name).first()
    if not item:
        # Create item placeholder or inform user
        vendor = get_or_create_vendor(db, vendor_phone)
        item = Item(
            vendor=vendor_phone,
            name=item_name,
            unit="pcs",
            qty=0.0,
            threshold=threshold,
            reordered=False
        )
        db.add(item)
    else:
        item.threshold = threshold
        item.updated_at = get_ist_now()

    db.commit()
    broadcaster.notify_sync("data_updated", {"vendor": vendor_phone, "item": item_name})
    return f"🔔 Alert level for *{item.name}* set to {threshold:g} {item.unit}."

def handle_help() -> str:
    return (
        "🤖 *Smart Stack AI Commands & Help*\n\n"
        "• *Add Stock*: 'Added 10kg rice, 5L oil' or '10 kg chawal aaya'\n"
        "• *Record Sale*: 'sold 2 bread @20' or 'becha 2 bread'\n"
        "• *Check Stock*: 'stock' (all items) or 'low' (low stock items)\n"
        "• *Sales Report*: 'report' or 'hisab' (today's revenue and sales)\n"
        "• *Undo*: 'undo' or 'wapas' (reverses last message)\n"
        "• *Set Alert Level*: 'alert rice 5' (notifies when rice <= 5kg)"
    )

def process_incoming_message(db: Session, vendor_phone: str, raw_text: str) -> str:
    get_or_create_vendor(db, vendor_phone)
    res: ParseResult = parse_message(raw_text)

    if res.is_command and res.command:
        cmd = res.command.command
        if cmd == "help":
            return handle_help()
        elif cmd == "stock":
            return handle_stock(db, vendor_phone, low_only=False)
        elif cmd == "low":
            return handle_stock(db, vendor_phone, low_only=True)
        elif cmd == "report":
            return handle_report(db, vendor_phone)
        elif cmd == "undo":
            return handle_undo(db, vendor_phone)
        elif cmd == "alert":
            if len(res.command.args) >= 2:
                return handle_alert_command(db, vendor_phone, res.command.args[0], res.command.args[1])
            return "Please specify the item and threshold, e.g. 'alert rice 5'."

    if res.actions:
        return apply_changes(db, vendor_phone, res.actions, raw_text)

    # Could not parse
    return (
        "Sorry, I couldn't understand that message.\n\n"
        + handle_help()
    )
