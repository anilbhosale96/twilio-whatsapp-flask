import csv
import io
import json
import uuid
import asyncio
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, time
from fastapi import APIRouter, Depends, Query, HTTPException, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc

from app.core.database import get_db
from app.core.time_utils import get_ist_now, IST
from app.core.formatters import format_inr
from app.models.vendor import Vendor
from app.models.item import Item
from app.models.transaction import Transaction
from app.services.chat_preview import mask_phone_number, chat_preview_manager
from app.services.broadcaster import broadcaster
from app.core.security import sanitize_input
from app.core.auth_dependency import get_current_vendor

router = APIRouter(prefix="/api", tags=["Dashboard API"])

def resolve_vendor(db: Session, vendor_param: Optional[str] = None, current_vendor: Optional[Vendor] = None) -> str:
    """Resolves vendor phone, prioritizing verified authenticated vendor."""
    if current_vendor:
        return current_vendor.phone
    if vendor_param:
        return vendor_param
    first = db.query(Vendor).first()
    if first:
        return first.phone
    return "whatsapp:+919876543210"

# --- Models ---
class InventoryCreateRequest(BaseModel):
    name: str = Field(..., min_length=1)
    unit: str = Field("pcs")
    qty: float = Field(0.0, ge=0)
    threshold: float = Field(5.0, ge=0)
    price: Optional[float] = Field(None, ge=0)

class InventoryPatchRequest(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    qty: Optional[float] = None
    threshold: Optional[float] = None
    price: Optional[float] = None
    reordered: Optional[bool] = None

class SettingsUpdateRequest(BaseModel):
    name: Optional[str] = None
    shop_name: Optional[str] = None
    default_threshold: Optional[float] = None
    language: Optional[str] = None

# --- Summary ---
@router.get("/summary")
def get_summary(
    vendor: Optional[str] = None,
    current_vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    vendor_phone = resolve_vendor(db, vendor, current_vendor)
    now_ist = get_ist_now()
    start_of_day = datetime.combine(now_ist.date(), time.min).replace(tzinfo=IST)

    items = db.query(Item).filter_by(vendor=vendor_phone).all()
    total_items = len(items)
    low_stock_count = sum(1 for it in items if it.qty <= it.threshold and it.qty >= 0)
    out_of_stock_count = sum(1 for it in items if it.qty == 0)
    negative_stock_count = sum(1 for it in items if it.qty < 0)

    # Transactions today (sales and stock updates)
    today_txs = (
        db.query(Transaction)
        .filter(
            Transaction.vendor == vendor_phone,
            Transaction.undone == False,
            Transaction.created_at >= start_of_day
        )
        .all()
    )

    today_sales = [tx for tx in today_txs if tx.change < 0]
    today_updates_count = len(today_txs)
    total_units_updated_today = sum(abs(tx.change) for tx in today_txs)
    sales_today_units = total_units_updated_today
    revenue_today = sum(abs(tx.change) * (tx.price or 0.0) for tx in today_sales)

    # Top sellers over last 30 days
    thirty_days_ago = now_ist - timedelta(days=30)
    top_txs = (
        db.query(
            Transaction.item_name,
            Transaction.unit,
            func.sum(func.abs(Transaction.change)).label("units_sold"),
            func.sum(func.abs(Transaction.change) * func.coalesce(Transaction.price, 0.0)).label("revenue")
        )
        .filter(
            Transaction.vendor == vendor_phone,
            Transaction.undone == False,
            Transaction.change < 0,
            Transaction.created_at >= thirty_days_ago
        )
        .group_by(Transaction.item_name, Transaction.unit)
        .order_by(desc("revenue"))
        .limit(5)
        .all()
    )

    top_sellers = [
        {
            "name": row[0],
            "unit": row[1],
            "units_sold": float(row[2]),
            "revenue": float(row[3]),
            "revenue_formatted": format_inr(float(row[3]))
        }
        for row in top_txs
    ]

    return {
        "vendor_masked": mask_phone_number(vendor_phone),
        "total_items": total_items,
        "low_stock_count": low_stock_count,
        "out_of_stock_count": out_of_stock_count,
        "negative_stock_count": negative_stock_count,
        "alerts_count": low_stock_count + negative_stock_count,
        "sales_today_units": sales_today_units,
        "today_updates_count": today_updates_count,
        "revenue_today": revenue_today,
        "revenue_today_formatted": format_inr(revenue_today),
        "top_sellers": top_sellers,
        "data_version": broadcaster.version
    }

# --- Inventory ---
@router.get("/inventory")
def get_inventory(
    vendor: Optional[str] = None,
    search: Optional[str] = None,
    low_only: bool = False,
    current_vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    vendor_phone = resolve_vendor(db, vendor, current_vendor)
    query = db.query(Item).filter_by(vendor=vendor_phone)

    if search:
        query = query.filter(Item.name.ilike(f"%{search.strip().lower()}%"))
    if low_only:
        query = query.filter(Item.qty <= Item.threshold)

    items = query.order_by(Item.name.asc()).all()
    return [
        {
            "id": it.id,
            "vendor_masked": mask_phone_number(it.vendor),
            "name": it.name,
            "unit": it.unit,
            "qty": it.qty,
            "threshold": it.threshold,
            "price": it.price,
            "price_formatted": format_inr(it.price) if it.price else None,
            "reordered": it.reordered,
            "is_low": it.qty <= it.threshold and it.qty >= 0,
            "is_out_of_stock": it.qty == 0,
            "is_negative": it.qty < 0,
            "updated_at": it.updated_at.isoformat()
        }
        for it in items
    ]

@router.post("/inventory")
def create_inventory_item(
    item_in: InventoryCreateRequest,
    current_vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    name_clean = sanitize_input(item_in.name.strip().lower())
    existing = db.query(Item).filter_by(vendor=current_vendor.phone, name=name_clean).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Item '{name_clean}' already exists in your shop.")

    new_item = Item(
        vendor=current_vendor.phone,
        name=name_clean,
        unit=item_in.unit.strip().lower() or "pcs",
        qty=float(item_in.qty),
        threshold=float(item_in.threshold),
        price=float(item_in.price) if item_in.price is not None else None,
        reordered=False
    )
    db.add(new_item)

    if new_item.qty > 0:
        tx = Transaction(
            batch_id=str(uuid.uuid4()),
            vendor=current_vendor.phone,
            item_name=new_item.name,
            unit=new_item.unit,
            change=new_item.qty,
            price=new_item.price or 0.0,
            raw_text=f"Initial stock added: +{new_item.qty:g} {new_item.unit}",
            created_at=get_ist_now(),
            undone=False
        )
        db.add(tx)

    db.commit()
    db.refresh(new_item)

    broadcaster.notify_sync("data_updated", {"item_id": new_item.id, "vendor": current_vendor.phone})

    return {
        "status": "success",
        "message": f"Product '{new_item.name}' added successfully",
        "item": {
            "id": new_item.id,
            "name": new_item.name,
            "unit": new_item.unit,
            "qty": new_item.qty,
            "threshold": new_item.threshold,
            "price": new_item.price,
            "price_formatted": format_inr(new_item.price) if new_item.price else None,
            "reordered": new_item.reordered,
            "is_low": new_item.qty <= new_item.threshold and new_item.qty >= 0,
            "is_out_of_stock": new_item.qty == 0,
            "is_negative": new_item.qty < 0,
            "updated_at": new_item.updated_at.isoformat()
        }
    }

@router.patch("/inventory/{item_id}")
def update_inventory_item(
    item_id: int,
    patch: InventoryPatchRequest,
    current_vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    item = db.query(Item).filter_by(id=item_id, vendor=current_vendor.phone).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found in your shop")

    if patch.name is not None and patch.name.strip():
        new_name = sanitize_input(patch.name.strip().lower())
        dup = db.query(Item).filter(Item.vendor == current_vendor.phone, Item.name == new_name, Item.id != item_id).first()
        if dup:
            raise HTTPException(status_code=400, detail=f"Another item named '{new_name}' already exists.")
        item.name = new_name

    if patch.unit is not None and patch.unit.strip():
        item.unit = patch.unit.strip().lower()

    if patch.qty is not None:
        diff = patch.qty - item.qty
        item.qty = patch.qty
        if diff != 0:
            tx = Transaction(
                batch_id=str(uuid.uuid4()),
                vendor=item.vendor,
                item_name=item.name,
                unit=item.unit,
                change=diff,
                price=item.price or 0.0,
                raw_text=f"Manual stock update: {'+' if diff > 0 else ''}{diff:g} {item.unit}",
                created_at=get_ist_now(),
                undone=False
            )
            db.add(tx)

    if patch.threshold is not None:
        item.threshold = patch.threshold
    if patch.price is not None:
        item.price = patch.price
    if patch.reordered is not None:
        item.reordered = patch.reordered

    item.updated_at = get_ist_now()
    db.commit()
    db.refresh(item)

    broadcaster.notify_sync("data_updated", {"item_id": item.id, "vendor": item.vendor})

    return {
        "status": "success",
        "item": {
            "id": item.id,
            "name": item.name,
            "unit": item.unit,
            "qty": item.qty,
            "threshold": item.threshold,
            "price": item.price,
            "price_formatted": format_inr(item.price) if item.price else None,
            "reordered": item.reordered,
            "is_low": item.qty <= item.threshold and item.qty >= 0,
            "is_out_of_stock": item.qty == 0,
            "is_negative": item.qty < 0,
            "updated_at": item.updated_at.isoformat()
        }
    }

@router.delete("/inventory/{item_id}")
def delete_inventory_item(
    item_id: int,
    current_vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    item = db.query(Item).filter_by(id=item_id, vendor=current_vendor.phone).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found in your shop")
    item_name = item.name
    db.delete(item)
    db.commit()
    broadcaster.notify_sync("data_updated", {"deleted_item_id": item_id, "vendor": current_vendor.phone})
    return {"status": "success", "message": f"Product '{item_name}' deleted."}

# --- Transactions ---
@router.get("/transactions")
def get_transactions(
    vendor: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    type: Optional[str] = None,
    search: Optional[str] = None,
    current_vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    vendor_phone = resolve_vendor(db, vendor, current_vendor)
    query = db.query(Transaction).filter_by(vendor=vendor_phone)

    if type == "add":
        query = query.filter(Transaction.change > 0)
    elif type == "sell":
        query = query.filter(Transaction.change < 0)

    if search:
        query = query.filter(
            or_(
                Transaction.item_name.ilike(f"%{search.strip()}%"),
                Transaction.raw_text.ilike(f"%{search.strip()}%")
            )
        )

    total_count = query.count()
    txs = query.order_by(Transaction.id.desc()).offset(offset).limit(limit).all()

    return {
        "total": total_count,
        "offset": offset,
        "limit": limit,
        "items": [
            {
                "id": tx.id,
                "batch_id": tx.batch_id,
                "vendor_masked": mask_phone_number(tx.vendor),
                "item_name": tx.item_name,
                "unit": tx.unit,
                "change": tx.change,
                "type": "add" if tx.change > 0 else "sell",
                "price": tx.price,
                "price_formatted": format_inr(tx.price) if tx.price else None,
                "revenue": abs(tx.change) * (tx.price or 0.0) if tx.change < 0 else 0.0,
                "revenue_formatted": format_inr(abs(tx.change) * (tx.price or 0.0)) if tx.change < 0 else None,
                "raw_text": tx.raw_text,
                "created_at": tx.created_at.isoformat(),
                "undone": tx.undone
            }
            for tx in txs
        ]
    }

# --- Alerts ---
@router.get("/alerts")
def get_alerts(
    vendor: Optional[str] = None,
    current_vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    vendor_phone = resolve_vendor(db, vendor, current_vendor)
    vendor_obj = db.query(Vendor).filter_by(phone=vendor_phone).first()
    vendor_name = vendor_obj.name if vendor_obj and vendor_obj.name else "My Shop"

    items = (
        db.query(Item)
        .filter(
            Item.vendor == vendor_phone,
            Item.qty <= Item.threshold
        )
        .order_by(Item.qty.asc())
        .all()
    )

    alert_items = []
    reorder_items_text = []

    for it in items:
        status = "negative" if it.qty < 0 else ("out_of_stock" if it.qty == 0 else "low_stock")
        reorder_suggested = max(0.0, (it.threshold * 2) - it.qty)
        reorder_items_text.append(f"{reorder_suggested:g} {it.unit} {it.name}")
        alert_items.append({
            "id": it.id,
            "name": it.name,
            "unit": it.unit,
            "qty": it.qty,
            "threshold": it.threshold,
            "price": it.price,
            "price_formatted": format_inr(it.price) if it.price else None,
            "status": status,
            "reordered": it.reordered,
            "reorder_suggested": reorder_suggested,
            "updated_at": it.updated_at.isoformat()
        })

    # Draft copyable supplier reorder message
    copyable_message = (
        f"Hi, purchase order from {vendor_name}:\n"
        + ", ".join(reorder_items_text)
        + "\nPlease confirm delivery."
    ) if reorder_items_text else "All items are well stocked!"

    return {
        "count": len(alert_items),
        "items": alert_items,
        "copyable_reorder_message": copyable_message
    }

# --- Reports ---
@router.get("/reports")
def get_reports(
    range_param: str = Query("today", alias="range", pattern="^(today|7d|30d)$"),
    vendor: Optional[str] = None,
    current_vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    vendor_phone = resolve_vendor(db, vendor, current_vendor)
    now_ist = get_ist_now()

    if range_param == "today":
        start_date = datetime.combine(now_ist.date(), time.min).replace(tzinfo=IST)
    elif range_param == "7d":
        start_date = datetime.combine((now_ist - timedelta(days=6)).date(), time.min).replace(tzinfo=IST)
    else:  # 30d
        start_date = datetime.combine((now_ist - timedelta(days=29)).date(), time.min).replace(tzinfo=IST)

    # Vendor items count & critical count
    vendor_items = db.query(Item).filter_by(vendor=vendor_phone).all()
    critical_count = sum(1 for it in vendor_items if it.qty <= it.threshold)
    total_shop_items = len(vendor_items)

    # All non-undone transactions in range
    all_txs = (
        db.query(Transaction)
        .filter(
            Transaction.vendor == vendor_phone,
            Transaction.undone == False,
            Transaction.created_at >= start_date
        )
        .all()
    )

    stock_in_txs = [tx for tx in all_txs if tx.change > 0]
    sales_txs = [tx for tx in all_txs if tx.change < 0]

    total_stock_in = sum(tx.change for tx in stock_in_txs)
    total_stock_out = sum(abs(tx.change) for tx in sales_txs)
    total_revenue = sum(abs(tx.change) * (tx.price or 0.0) for tx in sales_txs)

    # Generate daily movement buckets
    num_days = 7 if range_param == "7d" else (30 if range_param == "30d" else 1)
    daily_movement = []
    for day_offset in range(num_days - 1, -1, -1):
        day_date = (now_ist - timedelta(days=day_offset)).date()
        day_start = datetime.combine(day_date, time.min).replace(tzinfo=IST)
        day_end = datetime.combine(day_date, time.max).replace(tzinfo=IST)

        day_txs = [
            tx for tx in all_txs
            if day_start <= (tx.created_at if tx.created_at.tzinfo else tx.created_at.replace(tzinfo=IST)) <= day_end
        ]
        day_in = sum(tx.change for tx in day_txs if tx.change > 0)
        day_out = sum(abs(tx.change) for tx in day_txs if tx.change < 0)
        daily_movement.append({
            "date": day_date.isoformat(),
            "day_label": day_date.strftime("%a"),
            "stock_in": day_in,
            "stock_out": day_out,
            "total_moved": day_in + day_out
        })

    # Sales items breakdown
    item_breakdown: Dict[str, Dict[str, Any]] = {}
    for tx in sales_txs:
        units = abs(tx.change)
        rev = units * (tx.price or 0.0)

        if tx.item_name not in item_breakdown:
            item_breakdown[tx.item_name] = {
                "name": tx.item_name,
                "unit": tx.unit,
                "units_sold": 0.0,
                "revenue": 0.0
            }
        item_breakdown[tx.item_name]["units_sold"] += units
        item_breakdown[tx.item_name]["revenue"] += rev

    sorted_items = sorted(item_breakdown.values(), key=lambda x: x["revenue"], reverse=True)
    top_items = sorted_items[:5]
    slowest_items = sorted_items[-5:] if len(sorted_items) > 5 else []

    return {
        "range": range_param,
        "start_date": start_date.isoformat(),
        "total_revenue": total_revenue,
        "total_revenue_formatted": format_inr(total_revenue),
        "total_units_sold": total_stock_out,
        "total_stock_in_units": total_stock_in,
        "total_stock_out_units": total_stock_out,
        "item_count": total_shop_items,
        "critical_count": critical_count,
        "items": sorted_items,
        "top_items": top_items,
        "slowest_items": slowest_items,
        "daily_movement": daily_movement
    }

# --- CSV Export ---
@router.get("/export.csv")
def export_csv(
    vendor: Optional[str] = None,
    current_vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    vendor_phone = resolve_vendor(db, vendor, current_vendor)
    txs = (
        db.query(Transaction)
        .filter_by(vendor=vendor_phone)
        .order_by(Transaction.id.desc())
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Batch ID", "Vendor", "Item Name", "Unit", "Type",
        "Change", "Price (INR)", "Revenue (INR)", "Original Message",
        "Timestamp (IST)", "Undone"
    ])

    for tx in txs:
        action_type = "ADD" if tx.change > 0 else "SELL"
        rev = abs(tx.change) * (tx.price or 0.0) if tx.change < 0 else 0.0
        writer.writerow([
            tx.id,
            tx.batch_id,
            mask_phone_number(tx.vendor),
            tx.item_name,
            tx.unit,
            action_type,
            tx.change,
            tx.price if tx.price is not None else "",
            rev if rev > 0 else "",
            tx.raw_text,
            tx.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            tx.undone
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="smart_stack_transactions_{get_ist_now().strftime("%Y%m%d")}.csv"'
        }
    )

# --- Settings ---
@router.get("/settings")
def get_settings(
    vendor: Optional[str] = None,
    current_vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    vendor_phone = resolve_vendor(db, vendor, current_vendor)
    vendor_obj = db.query(Vendor).filter_by(phone=vendor_phone).first()
    if not vendor_obj:
        vendor_obj = Vendor(
            phone=vendor_phone,
            name="Sharma Kirana Store",
            shop_name="Sharma Kirana & General Store",
            default_threshold=5.0,
            language="en"
        )
        db.add(vendor_obj)
        db.commit()
        db.refresh(vendor_obj)

    return {
        "phone_masked": mask_phone_number(vendor_obj.phone),
        "phone_raw": vendor_obj.phone,
        "name": vendor_obj.name,
        "shop_name": vendor_obj.shop_name or vendor_obj.name,
        "category": vendor_obj.category or "Grocery",
        "default_threshold": vendor_obj.default_threshold,
        "language": vendor_obj.language,
        "created_at": vendor_obj.created_at.isoformat()
    }

@router.put("/settings")
def update_settings(
    settings_in: SettingsUpdateRequest,
    vendor: Optional[str] = None,
    current_vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    vendor_phone = resolve_vendor(db, vendor, current_vendor)
    vendor_obj = db.query(Vendor).filter_by(phone=vendor_phone).first()
    if not vendor_obj:
        raise HTTPException(status_code=404, detail="Vendor not found")

    if settings_in.name is not None:
        vendor_obj.name = sanitize_input(settings_in.name.strip())
    if settings_in.shop_name is not None:
        vendor_obj.shop_name = sanitize_input(settings_in.shop_name.strip())
    if settings_in.default_threshold is not None:
        vendor_obj.default_threshold = max(0.0, float(settings_in.default_threshold))
    if settings_in.language is not None:
        vendor_obj.language = sanitize_input(settings_in.language.strip())

    db.commit()
    db.refresh(vendor_obj)

    broadcaster.notify_sync("settings_updated", {"vendor": vendor_obj.phone})

    return {
        "status": "success",
        "settings": {
            "name": vendor_obj.name,
            "shop_name": vendor_obj.shop_name or vendor_obj.name,
            "category": vendor_obj.category or "Grocery",
            "default_threshold": vendor_obj.default_threshold,
            "language": vendor_obj.language,
            "phone_raw": vendor_obj.phone,
            "phone_masked": mask_phone_number(vendor_obj.phone)
        }
    }

# --- Live Chat Preview ---
@router.get("/chat-preview")
def get_chat_preview(
    current_vendor: Vendor = Depends(get_current_vendor)
) -> Dict[str, Any]:
    return {
        "latest": chat_preview_manager.get_latest(phone=current_vendor.phone),
        "history": chat_preview_manager.get_all(phone=current_vendor.phone)
    }

# --- Server-Sent Events (SSE) Stream ---
@router.get("/stream")
async def event_stream():
    """SSE endpoint emitting events on data changes and ping every 15s"""
    async def sse_generator():
        q = broadcaster.subscribe()
        try:
            # Send initial sync event
            yield f"event: connected\ndata: {{\"version\": {broadcaster.version}, \"status\": \"connected\"}}\n\n"
            while True:
                try:
                    # Wait for next event or 15s keep-alive
                    payload = await asyncio.wait_for(q.get(), timeout=15.0)
                    yield f"event: update\ndata: {json.dumps(payload) if isinstance(payload, dict) else payload}\n\n"
                except asyncio.TimeoutError:
                    # 15-second keep-alive ping per TRD
                    yield f": keep-alive ping {get_ist_now().isoformat()}\n\n"
        finally:
            broadcaster.unsubscribe(q)

    return StreamingResponse(
        sse_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
