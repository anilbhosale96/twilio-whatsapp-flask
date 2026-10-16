import csv
import io
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

router = APIRouter(prefix="/api", tags=["Dashboard API"])

def resolve_vendor(db: Session, vendor_param: Optional[str] = None) -> str:
    if vendor_param:
        return vendor_param
    first = db.query(Vendor).first()
    if first:
        return first.phone
    return "whatsapp:+919876543210"

# --- Models ---
class InventoryPatchRequest(BaseModel):
    threshold: Optional[float] = None
    price: Optional[float] = None
    reordered: Optional[bool] = None

class SettingsUpdateRequest(BaseModel):
    name: Optional[str] = None
    default_threshold: Optional[float] = None
    language: Optional[str] = None

# --- Summary ---
@router.get("/summary")
def get_summary(
    vendor: Optional[str] = None,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    vendor_phone = resolve_vendor(db, vendor)
    now_ist = get_ist_now()
    start_of_day = datetime.combine(now_ist.date(), time.min).replace(tzinfo=IST)

    items = db.query(Item).filter_by(vendor=vendor_phone).all()
    total_items = len(items)
    low_stock_count = sum(1 for it in items if it.qty <= it.threshold and it.qty >= 0)
    out_of_stock_count = sum(1 for it in items if it.qty == 0)
    negative_stock_count = sum(1 for it in items if it.qty < 0)

    # Sales today
    today_sales = (
        db.query(Transaction)
        .filter(
            Transaction.vendor == vendor_phone,
            Transaction.undone == False,
            Transaction.change < 0,
            Transaction.created_at >= start_of_day
        )
        .all()
    )

    sales_today_units = sum(abs(tx.change) for tx in today_sales)
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
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    vendor_phone = resolve_vendor(db, vendor)
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

@router.patch("/inventory/{item_id}")
def update_inventory_item(
    item_id: int,
    patch: InventoryPatchRequest,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    item = db.query(Item).filter_by(id=item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

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
            "threshold": item.threshold,
            "price": item.price,
            "reordered": item.reordered
        }
    }

# --- Transactions ---
@router.get("/transactions")
def get_transactions(
    vendor: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    vendor_phone = resolve_vendor(db, vendor)
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
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    vendor_phone = resolve_vendor(db, vendor)
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
    range: str = Query("today", pattern="^(today|7d|30d)$"),
    vendor: Optional[str] = None,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    vendor_phone = resolve_vendor(db, vendor)
    now_ist = get_ist_now()

    if range == "today":
        start_date = datetime.combine(now_ist.date(), time.min).replace(tzinfo=IST)
    elif range == "7d":
        start_date = now_ist - timedelta(days=7)
    else:  # 30d
        start_date = now_ist - timedelta(days=30)

    txs = (
        db.query(Transaction)
        .filter(
            Transaction.vendor == vendor_phone,
            Transaction.undone == False,
            Transaction.change < 0,
            Transaction.created_at >= start_date
        )
        .all()
    )

    item_breakdown: Dict[str, Dict[str, Any]] = {}
    total_revenue = 0.0
    total_units = 0.0

    for tx in txs:
        units = abs(tx.change)
        rev = units * (tx.price or 0.0)
        total_units += units
        total_revenue += rev

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
        "range": range,
        "start_date": start_date.isoformat(),
        "total_revenue": total_revenue,
        "total_revenue_formatted": format_inr(total_revenue),
        "total_units_sold": total_units,
        "item_count": len(sorted_items),
        "items": sorted_items,
        "top_items": top_items,
        "slowest_items": slowest_items
    }

# --- CSV Export ---
@router.get("/export.csv")
def export_csv(
    vendor: Optional[str] = None,
    db: Session = Depends(get_db)
):
    vendor_phone = resolve_vendor(db, vendor)
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
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    vendor_phone = resolve_vendor(db, vendor)
    vendor_obj = db.query(Vendor).filter_by(phone=vendor_phone).first()
    if not vendor_obj:
        vendor_obj = Vendor(
            phone=vendor_phone,
            name="Sharma Kirana Store",
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
        "default_threshold": vendor_obj.default_threshold,
        "language": vendor_obj.language,
        "created_at": vendor_obj.created_at.isoformat()
    }

@router.put("/settings")
def update_settings(
    settings_in: SettingsUpdateRequest,
    vendor: Optional[str] = None,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    vendor_phone = resolve_vendor(db, vendor)
    vendor_obj = db.query(Vendor).filter_by(phone=vendor_phone).first()
    if not vendor_obj:
        raise HTTPException(status_code=404, detail="Vendor not found")

    if settings_in.name is not None:
        vendor_obj.name = settings_in.name.strip()
    if settings_in.default_threshold is not None:
        vendor_obj.default_threshold = settings_in.default_threshold
    if settings_in.language is not None:
        vendor_obj.language = settings_in.language.strip()

    db.commit()
    db.refresh(vendor_obj)

    broadcaster.notify_sync("settings_updated", {"vendor": vendor_obj.phone})

    return {
        "status": "success",
        "settings": {
            "name": vendor_obj.name,
            "default_threshold": vendor_obj.default_threshold,
            "language": vendor_obj.language
        }
    }

# --- Live Chat Preview ---
@router.get("/chat-preview")
def get_chat_preview() -> Dict[str, Any]:
    return {
        "latest": chat_preview_manager.get_latest(),
        "history": chat_preview_manager.get_all()
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
                    yield f"event: update\ndata: {payload}\n\n"
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
