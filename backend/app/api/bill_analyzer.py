import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.time_utils import get_ist_now
from app.models.vendor import Vendor
from app.models.item import Item
from app.models.transaction import Transaction
from app.services.broadcaster import broadcaster
from app.core.auth_security import normalize_phone
from app.services.bill_parser import parse_full_bill_text

router = APIRouter(prefix="/api", tags=["Bill & Invoice Analyzer"])

class BillItemPayload(BaseModel):
    name: str = Field(..., min_length=1)
    qty: float = Field(..., gt=0)
    unit: str = Field("pcs")
    price: Optional[float] = None
    action: str = Field("ADD")  # "ADD" or "SELL"

class ApplyBillRequest(BaseModel):
    bill_type: str = Field("received")  # "received" (stock in) or "sold" (stock out)
    bill_reference: Optional[str] = None
    vendor: Optional[str] = None
    items: List[BillItemPayload]

class AnalyzeTextRequest(BaseModel):
    text: str
    bill_type: Optional[str] = None

@router.post("/analyze-bill")
async def analyze_bill(
    request: Request,
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
    bill_type: Optional[str] = Form(None)
):
    """
    Analyzes an uploaded bill file (TXT, CSV, PDF, or image) or raw text.
    Extracts line items, quantities, units, rates, and categorizes as Goods Received or Goods Sold.
    """
    raw_content = ""

    # Check if JSON payload was sent instead of multipart form
    content_type = request.headers.get("content-type", "").lower()
    if "application/json" in content_type:
        try:
            body = await request.json()
            if isinstance(body, dict):
                raw_content = body.get("text", "")
                if not bill_type:
                    bill_type = body.get("bill_type")
        except Exception:
            pass

    # Extract text from uploaded file if provided
    if file and not raw_content:
        file_bytes = await file.read()
        filename = (file.filename or "").lower()

        if filename.endswith(".csv") or filename.endswith(".txt") or filename.endswith(".tsv"):
            raw_content = file_bytes.decode("utf-8", errors="ignore")
        elif filename.endswith(".pdf"):
            # Try basic text extraction from PDF
            try:
                import io
                content_str = file_bytes.decode("latin-1", errors="ignore")
                # Extract text between parenthesis or text blocks
                extracted = re.findall(r'\(([^\(\)]+)\)\s*T[jJ]', content_str)
                if extracted:
                    raw_content = "\n".join(extracted)
                else:
                    raw_content = file_bytes.decode("utf-8", errors="ignore")
            except Exception:
                raw_content = file_bytes.decode("utf-8", errors="ignore")
        else:
            # Image file (PNG, JPG, WEBP)
            # Decode ASCII/UTF-8 strings embedded or prompt OCR
            raw_content = file_bytes.decode("utf-8", errors="ignore")

    # Fallback to form parameter text
    if not raw_content and text:
        raw_content = text

    if not raw_content or not raw_content.strip():
        raise HTTPException(
            status_code=400,
            detail="No readable text found. Please upload a receipt or paste bill text."
        )

    result = parse_full_bill_text(raw_content, override_type=bill_type)
    return {
        "success": True,
        **result
    }


@router.post("/apply-bill")
async def apply_bill_to_inventory(
    payload: ApplyBillRequest,
    db: Session = Depends(get_db)
):
    """
    Applies the verified bill items directly to the shop's inventory.
    Updates stock levels, logs transactions, and broadcasts live SSE notifications.
    """
    if not payload.items:
        raise HTTPException(status_code=400, detail="No items to add to inventory.")

    # Resolve vendor phone
    if payload.vendor and str(payload.vendor).strip():
        vendor_phone = normalize_phone(str(payload.vendor).strip())
    else:
        first_v = db.query(Vendor).first()
        vendor_phone = first_v.phone if first_v else "whatsapp:+919876543210"

    vendor = db.query(Vendor).filter_by(phone=vendor_phone).first()
    if not vendor:
        vendor = Vendor(
            phone=vendor_phone,
            name="Shop Owner",
            shop_name="My Shop",
            default_threshold=5.0
        )
        db.add(vendor)
        db.commit()

    batch_id = str(uuid.uuid4())
    bill_action = "ADD" if payload.bill_type.lower() == "received" else "SELL"
    ref = payload.bill_reference or ("Supplier Bill" if bill_action == "ADD" else "Sales Bill")
    now_ist = get_ist_now()

    applied_results = []

    try:
        for item_data in payload.items:
            clean_name = item_data.name.strip().lower()
            qty_val = float(item_data.qty)
            unit_val = item_data.unit.strip().lower() or "pcs"
            price_val = float(item_data.price) if item_data.price is not None else None

            # Look for existing item (case-insensitive name match)
            existing_item = (
                db.query(Item)
                .filter(Item.vendor == vendor_phone, Item.name == clean_name)
                .first()
            )

            if not existing_item:
                # Create new product in inventory
                existing_item = Item(
                    vendor=vendor_phone,
                    name=clean_name,
                    unit=unit_val,
                    qty=0.0,
                    threshold=vendor.default_threshold if vendor else 5.0,
                    price=price_val,
                    reordered=False,
                    updated_at=now_ist
                )
                db.add(existing_item)
                db.flush()
            else:
                if price_val is not None:
                    existing_item.price = price_val

            # Compute change: positive for received/stock in, negative for sold/stock out
            item_action = item_data.action.upper() if item_data.action else bill_action
            change = qty_val if item_action == "ADD" else -qty_val
            existing_item.qty += change
            existing_item.updated_at = now_ist

            # Create Transaction record
            tx = Transaction(
                batch_id=batch_id,
                vendor=vendor_phone,
                item_name=existing_item.name,
                unit=existing_item.unit,
                change=change,
                price=price_val,
                raw_text=f"[Bill {payload.bill_type.capitalize()}: {ref}] {abs(change):g} {existing_item.unit} {existing_item.name}",
                created_at=now_ist,
                undone=False
            )
            db.add(tx)

            applied_results.append({
                "name": existing_item.name,
                "change": change,
                "new_qty": existing_item.qty,
                "unit": existing_item.unit,
                "price": existing_item.price
            })

        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update inventory: {str(e)}")

    # Broadcast live SSE update so Dashboard, Inventory, Transactions update instantly!
    broadcaster.notify_sync("data_updated", {
        "vendor": vendor_phone,
        "batch_id": batch_id,
        "source": "bill_analyzer",
        "bill_type": payload.bill_type,
        "count": len(applied_results)
    })

    return {
        "success": True,
        "message": f"Successfully applied {len(applied_results)} items to inventory!",
        "batch_id": batch_id,
        "bill_type": payload.bill_type,
        "vendor": vendor_phone,
        "applied_items": applied_results,
        "updated_at": now_ist.isoformat()
    }
