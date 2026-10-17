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
    from app.core.auth_security import normalize_phone
    norm_phone = normalize_phone(phone) if phone else "whatsapp:+919876543210"
    vendor = db.query(Vendor).filter_by(phone=norm_phone).first()
    if not vendor:
        vendor = Vendor(
            phone=norm_phone,
            name=None,
            default_threshold=settings.DEFAULT_THRESHOLD,
            language=settings.DEFAULT_LANGUAGE
        )
        db.add(vendor)
        db.commit()
        db.refresh(vendor)
    return vendor

def find_vendor_item(db: Session, vendor_phone: str, search_name: str) -> Optional[Item]:
    norm_search = search_name.strip().lower()
    vendor_items = db.query(Item).filter_by(vendor=vendor_phone).all()
    
    # 1. Exact case-insensitive match (e.g. 'Tata Salt' matches 'tata salt')
    for it in vendor_items:
        if it.name.strip().lower() == norm_search:
            return it
            
    # 2. Match without package size suffix (e.g. 'tata salt' matches 'Tata Salt 1kg')
    for it in vendor_items:
        it_name_clean = it.name.strip().lower()
        if it_name_clean.startswith(norm_search) or norm_search.startswith(it_name_clean):
            return it
            
    # 3. Match multi-word core tokens
    tokens_search = set(norm_search.split())
    if len(tokens_search) >= 2:
        for it in vendor_items:
            tokens_it = set(it.name.strip().lower().split())
            if tokens_search.issubset(tokens_it) or tokens_it.issubset(tokens_search):
                return it

    return None

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
            item = find_vendor_item(db, vendor_phone, action.item_name)
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

            # Build reply line localized by vendor.language
            lang = vendor.language or "en"
            price_text = f" @ {format_inr(action.price)}" if action.price is not None else ""
            if lang == "hi":
                verb = "जोड़ा" if action.action == "ADD" else "बेचा"
                reply_lines.append(f"• {verb} {action.quantity:g} {item.unit} {item.name}{price_text} (स्टॉक: {item.qty:g} {item.unit})")
            elif lang == "mr":
                verb = "भरले" if action.action == "ADD" else "विकले"
                reply_lines.append(f"• {verb} {action.quantity:g} {item.unit} {item.name}{price_text} (साठा: {item.qty:g} {item.unit})")
            elif lang == "gu":
                verb = "ઉમેર્યું" if action.action == "ADD" else "વેચ્યું"
                reply_lines.append(f"• {verb} {action.quantity:g} {item.unit} {item.name}{price_text} (સ્ટોક: {item.qty:g} {item.unit})")
            else:
                verb = "Added" if action.action == "ADD" else "Sold"
                reply_lines.append(f"• {verb} {action.quantity:g} {item.unit} {item.name}{price_text} (Stock: {item.qty:g} {item.unit})")

            # Check alerts
            if item.qty < 0:
                if lang == "hi":
                    alerts.append(f"🚨 चेतावनी: {item.name} नेगेटिव स्टॉक में है ({item.qty:g} {item.unit})!")
                elif lang == "mr":
                    alerts.append(f"🚨 सावधान: {item.name} चा साठा उणे झाला आहे ({item.qty:g} {item.unit})!")
                elif lang == "gu":
                    alerts.append(f"🚨 ચેતવણી: {item.name} નેગેટિવ સ્ટોકમાં છે ({item.qty:g} {item.unit})!")
                else:
                    alerts.append(f"🚨 Warning: {item.name} is in negative stock ({item.qty:g} {item.unit})!")
            elif item.qty <= item.threshold:
                if lang == "hi":
                    alerts.append(f"⚠️ कम स्टॉक: {item.name} सिर्फ {item.qty:g} {item.unit} बचा है (अलर्ट स्तर: {item.threshold:g} {item.unit})")
                elif lang == "mr":
                    alerts.append(f"⚠️ कमी साठा: {item.name} फक्त {item.qty:g} {item.unit} शिल्लक आहे (अलर्ट स्तर: {item.threshold:g} {item.unit})")
                elif lang == "gu":
                    alerts.append(f"⚠️ ઓછો સ્ટોક: {item.name} માત્ર {item.qty:g} {item.unit} બાકી છે (અલર્ટ લેવલ: {item.threshold:g} {item.unit})")
                else:
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
            item = find_vendor_item(db, vendor_phone, tx.item_name)
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

def handle_start(vendor: Vendor) -> str:
    lang = vendor.language or "en"
    shop_title = vendor.shop_name or "SmartStock Store"
    owner_title = f", {vendor.name}" if vendor.name else ""

    if lang == "hi":
        return (
            f"👋 *नमस्ते{owner_title}! SmartStock AI में आपका स्वागत है!*\n\n"
            f"आपकी दुकान: *{shop_title}*\n\n"
            "⚙️ *दुकान सेटअप करने के लिए:* \n"
            "• नाम बदलने के लिए: *name <आपका नाम>*\n"
            "• दुकान का नाम: *shop <दुकान का नाम>*\n"
            "• भाषा बदलने के लिए: *lang en* (English), *lang hi* (हिंदी), *lang mr* (मराठी), *lang gu* (ગુજરાતી)\n\n"
            "📦 *स्टॉक अपडेट के लिए सीधे मैसेज भेजें:* \n"
            "• '10kg chawal aaya' (स्टॉक जोड़ें)\n"
            "• '2 packet doodh becha' (बिक्री दर्ज करें)\n"
            "• 'stock' (स्टॉक देखें) या 'report' (आज का हिसाब)"
        )
    elif lang == "mr":
        return (
            f"👋 *नमस्कार{owner_title}! SmartStock AI मध्ये आपले स्वागत आहे!*\n\n"
            f"आपले दुकान: *{shop_title}*\n\n"
            "⚙️ *दुकान सेटअप करण्यासाठी:* \n"
            "• नाव: *name <तुमचे नाव>*\n"
            "• दुकानाचे नाव: *shop <दुकानाचे नाव>*\n"
            "• भाषा: *lang mr* (मराठी), *lang hi* (हिंदी), *lang en* (English)\n\n"
            "📦 *स्टॉक अपडेट करण्यासाठी थेट मेसेज पाठवा:* \n"
            "• '10kg tandul aala'\n"
            "• '2 packet doodh vikla'\n"
            "• 'stock' किंवा 'report'"
        )
    elif lang == "gu":
        return (
            f"👋 *નમસ્તે{owner_title}! SmartStock AI માં આપનું સ્વાગત છે!*\n\n"
            f"તમારી દુકાન: *{shop_title}*\n\n"
            "⚙️ *સેટઅપ કરવા માટે:* \n"
            "• નામ: *name <તમારું નામ>*\n"
            "• દુકાનનું નામ: *shop <દુકાનનું નામ>*\n"
            "• ભાષા: *lang gu* / *lang hi* / *lang en*\n\n"
            "📦 *સ્ટોક અપડેટ કરવા માટે:* \n"
            "• '10kg chawal aaya'\n"
            "• '2 bread becha'\n"
            "• 'stock' અથવા 'report'"
        )
    else:
        return (
            f"👋 *Welcome{owner_title} to SmartStock AI!*\n\n"
            f"Your shop: *{shop_title}*\n\n"
            "⚙️ *Quick WhatsApp Setup:* \n"
            "• Set Shop Name: *shop <Shop Name>* (e.g. `shop Sharma General Store`)\n"
            "• Set Owner Name: *name <Your Name>* (e.g. `name Rajesh`)\n"
            "• Switch Language: *lang hi* (Hindi), *lang mr* (Marathi), *lang gu* (Gujarati), *lang en* (English)\n\n"
            "📦 *Daily Inventory Tracking:* \n"
            "• Add Stock: `10kg rice, 5L oil aaya`\n"
            "• Record Sale: `sold 2 bread @20`\n"
            "• Check Stock: `stock` or `low`\n"
            "• Daily Summary: `report` or `hisab`\n"
            "• Undo Mistake: `undo`"
        )

def handle_lang(db: Session, vendor: Vendor, lang_input: str) -> str:
    cleaned = lang_input.strip().lower()
    target_lang = "en"
    if cleaned in {"hi", "hindi", "hind"}:
        target_lang = "hi"
    elif cleaned in {"mr", "marathi", "marath"}:
        target_lang = "mr"
    elif cleaned in {"gu", "gujarati", "guj"}:
        target_lang = "gu"
    elif cleaned in {"en", "english", "eng"}:
        target_lang = "en"
    else:
        return "Supported languages: *lang en* (English), *lang hi* (Hindi), *lang mr* (Marathi), *lang gu* (Gujarati)."

    vendor.language = target_lang
    db.commit()
    broadcaster.notify_sync("data_updated", {"vendor": vendor.phone, "language": target_lang})

    if target_lang == "hi":
        return "✅ भाषा सफलतापूर्वक *हिंदी* सेट कर दी गई है! अब आपको सभी अपडेट हिंदी में मिलेंगे।"
    elif target_lang == "mr":
        return "✅ भाषा यशस्वीरित्या *मराठी* सेट करण्यात आली आहे! आता तुम्हाला सर्व अपडेट्स मराठीत मिळतील."
    elif target_lang == "gu":
        return "✅ ભાષા સફળતાપૂર્વક *ગુજરાતી* સેટ કરવામાં આવી છે! હવે તમને બધા અપડેટ્સ ગુજરાતીમાં મળશે."
    else:
        return "✅ Language successfully set to *English*! All future updates and alerts will be in English."

def handle_shop(db: Session, vendor: Vendor, shop_name: str) -> str:
    cleaned = shop_name.strip()
    if not cleaned:
        return "Please provide a valid shop name, e.g. 'shop Sharma Kirana Store'."
    vendor.shop_name = cleaned.title()
    db.commit()
    broadcaster.notify_sync("data_updated", {"vendor": vendor.phone, "shop_name": vendor.shop_name})
    if vendor.language == "hi":
        return f"🏪 दुकान का नाम बदलकर *{vendor.shop_name}* कर दिया गया है!"
    elif vendor.language == "mr":
        return f"🏪 दुकानाचे नाव बदलून *{vendor.shop_name}* करण्यात आले आहे!"
    return f"🏪 Shop name updated to *{vendor.shop_name}*!"

def handle_name(db: Session, vendor: Vendor, owner_name: str) -> str:
    cleaned = owner_name.strip()
    if not cleaned:
        return "Please provide your name, e.g. 'name Rajesh'."
    vendor.name = cleaned.title()
    db.commit()
    broadcaster.notify_sync("data_updated", {"vendor": vendor.phone, "name": vendor.name})
    if vendor.language == "hi":
        return f"👤 मालिक का नाम *{vendor.name}* सेट हो गया है!"
    elif vendor.language == "mr":
        return f"👤 मालकाचे नाव *{vendor.name}* सेट झाले आहे!"
    return f"👤 Owner name updated to *{vendor.name}*!"

def handle_help(language: str = "en") -> str:
    if language == "hi":
        return (
            "🤖 *SmartStock AI कमांड और सहायता*\n\n"
            "• *स्टॉक जोड़ें*: '10kg chawal aaya' या '10 packet parle g laya'\n"
            "• *बिक्री दर्ज करें*: 'becha 2 bread @20' या '5 doodh becha'\n"
            "• *स्टॉक देखें*: 'stock' (सभी सामान) या 'low' (कम स्टॉक सामान)\n"
            "• *आज का हिसाब*: 'report' या 'hisab' (आज की बिक्री और कमाई)\n"
            "• *गलती सुधारें*: 'undo' या 'wapas' (पिछला संदेश रद्द करें)\n"
            "• *अलर्ट सेट करें*: 'alert chawal 5' (5kg से कम होने पर चेतावनी)\n"
            "• *भाषा बदलें*: 'lang hi', 'lang mr', 'lang gu', 'lang en'"
        )
    elif language == "mr":
        return (
            "🤖 *SmartStock AI कमांड्स आणि मदत*\n\n"
            "• *साठा भरा*: '10kg tandul aala' किंवा '5 tel anle'\n"
            "• *विक्री नोंदवा*: '2 bread vikla @25' किंवा '5 doodh gela'\n"
            "• *साठा पाहा*: 'stock' (सर्व साठा) किंवा 'low' (कमी असलेला साठा)\n"
            "• *आजचा हिशोब*: 'report' किंवा 'hisab' (आजची एकूण कमाई)\n"
            "• *रद्द करा*: 'undo' किंवा 'chuk' (मागील बदल मागे घ्या)\n"
            "• *भाषा बदला*: 'lang mr', 'lang hi', 'lang en'"
        )
    return (
        "🤖 *Smart Stack AI Commands & Help*\n\n"
        "• *Add Stock*: 'Added 10kg rice, 5L oil' or '10 kg chawal aaya'\n"
        "• *Record Sale*: 'sold 2 bread @20' or 'becha 2 bread'\n"
        "• *Check Stock*: 'stock' (all items) or 'low' (low stock items)\n"
        "• *Sales Report*: 'report' or 'hisab' (today's revenue and sales)\n"
        "• *Undo*: 'undo' or 'wapas' (reverses last message)\n"
        "• *Set Alert Level*: 'alert rice 5' (notifies when rice <= 5kg)\n"
        "• *Change Language*: 'lang hi' (Hindi), 'lang mr' (Marathi), 'lang gu' (Gujarati), 'lang en' (English)"
    )

def process_incoming_message(db: Session, vendor_phone: str, raw_text: str) -> str:
    vendor = get_or_create_vendor(db, vendor_phone)
    res: ParseResult = parse_message(raw_text)

    if res.is_command and res.command:
        cmd = res.command.command
        if cmd == "start":
            return handle_start(vendor)
        elif cmd == "lang":
            lang_arg = res.command.args[0] if res.command.args else "en"
            return handle_lang(db, vendor, lang_arg)
        elif cmd == "shop":
            shop_arg = res.command.args[0] if res.command.args else ""
            return handle_shop(db, vendor, shop_arg)
        elif cmd == "name":
            name_arg = res.command.args[0] if res.command.args else ""
            return handle_name(db, vendor, name_arg)
        elif cmd == "help":
            return handle_help(vendor.language)
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
        + handle_help(vendor.language)
    )

