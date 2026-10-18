import os
import uuid
import json
import secrets
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
    Request,
    Response,
    status
)
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.time_utils import get_ist_now
from app.core.auth_dependency import get_current_customer, get_current_vendor, get_optional_user
from app.core.auth_security import normalize_phone
from app.services.chat_preview import mask_phone_number
from app.models.vendor import Vendor
from app.models.customer import Customer
from app.models.item import Item
from app.models.transaction import Transaction
from app.models.order import Order, OrderItem
from app.models.bill import Bill
from app.services.broadcaster import broadcaster
from app.services.pricing_service import identify_and_price_item
from app.services.pdf_generator import calculate_bill_totals, generate_invoice_pdf
from app.services.notification_service import send_whatsapp_or_sms_notification, log_notification_event
from app.services.bill_parser import parse_full_bill_text

router = APIRouter(prefix="/api", tags=["Orders & Quotations"])

# Secure directories for uploads and generated bills
_BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOADS_ORDERS_DIR = _BASE_DIR / "uploads" / "orders"
UPLOADS_BILLS_DIR = _BASE_DIR / "uploads" / "bills"
UPLOADS_ORDERS_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_BILLS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf", ".txt"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB limit


# --- Schemas ---

class CartItemPayload(BaseModel):
    item_id: Optional[int] = None
    product_name: str
    unit: str = "pcs"
    qty: float = Field(..., gt=0)
    unit_price: Optional[float] = None

class CreateOrderRequest(BaseModel):
    vendor_phone: str
    customer_name: Optional[str] = None
    customer_address: Optional[str] = None
    customer_phone: Optional[str] = None
    request_type: str = "cart"  # cart, custom_text, image_list
    raw_text: Optional[str] = None
    notes: Optional[str] = None
    items: Optional[List[CartItemPayload]] = None

class UpdateOrderItemsRequest(BaseModel):
    items: List[CartItemPayload]
    notes: Optional[str] = None

class SendQuotationRequest(BaseModel):
    discount: float = 0.0
    tax_rate: float = 0.0
    delivery_charge: float = 0.0
    notes: Optional[str] = None

class GenerateBillRequest(BaseModel):
    bill_type: str = "invoice"  # "invoice" or "quotation"
    discount: float = 0.0
    tax_rate: float = 0.0
    delivery_charge: float = 0.0
    payment_method: Optional[str] = "Cash"
    notes: Optional[str] = None

class UpdateStatusRequest(BaseModel):
    status: str
    notes: Optional[str] = None


# --- Helper Functions ---

def generate_unique_order_id() -> str:
    today_str = get_ist_now().strftime("%Y%m%d")
    random_suffix = secrets.token_hex(2).upper()
    return f"ORD-{today_str}-{random_suffix}"

def generate_sequential_bill_number(db: Session, bill_type: str = "invoice") -> str:
    prefix = "INV" if bill_type == "invoice" else "QTE"
    today_str = get_ist_now().strftime("%Y%m%d")
    count = db.query(Bill).filter(Bill.bill_number.like(f"{prefix}-{today_str}-%")).count() + 1
    return f"{prefix}-{today_str}-{count:03d}"

def deduct_order_stock_transactional(db: Session, order: Order) -> None:
    """Safely deducts inventory in an atomic transaction, preventing double deductions."""
    if order.stock_deducted:
        return

    for oi in order.items:
        if oi.item_id:
            inv_item = db.query(Item).filter_by(id=oi.item_id, vendor=order.vendor_phone).first()
            if inv_item:
                inv_item.qty = max(0.0, float(inv_item.qty) - float(oi.qty))
                tx = Transaction(
                    batch_id=str(uuid.uuid4()),
                    vendor=order.vendor_phone,
                    item_name=inv_item.name,
                    unit=inv_item.unit,
                    change=-float(oi.qty),
                    price=oi.unit_price,
                    raw_text=f"Customer Order {order.id}"
                )
                db.add(tx)

    order.stock_deducted = True
    db.commit()

def restore_order_stock_transactional(db: Session, order: Order) -> None:
    """Restores inventory if an order that previously deducted stock gets cancelled."""
    if not order.stock_deducted:
        return

    for oi in order.items:
        if oi.item_id:
            inv_item = db.query(Item).filter_by(id=oi.item_id, vendor=order.vendor_phone).first()
            if inv_item:
                inv_item.qty = float(inv_item.qty) + float(oi.qty)
                tx = Transaction(
                    batch_id=str(uuid.uuid4()),
                    vendor=order.vendor_phone,
                    item_name=inv_item.name,
                    unit=inv_item.unit,
                    change=float(oi.qty),
                    price=oi.unit_price,
                    raw_text=f"Cancelled Order Reversal {order.id}"
                )
                db.add(tx)

    order.stock_deducted = False
    db.commit()

def serialize_order(order: Order) -> Dict[str, Any]:
    items_out = []
    for it in order.items:
        items_out.append({
            "id": it.id,
            "item_id": it.item_id,
            "product_name": it.product_name,
            "unit": it.unit,
            "qty": it.qty,
            "unit_price": it.unit_price,
            "line_total": it.line_total,
            "price_source": it.price_source,
            "reference_note": it.reference_note,
            "reference_confidence": it.reference_confidence,
            "in_stock": it.in_stock,
            "current_inventory_qty": it.current_inventory_qty,
            "is_confirmed_by_vendor": it.is_confirmed_by_vendor
        })

    bills_out = []
    for b in order.bills:
        bills_out.append({
            "id": b.id,
            "bill_number": b.bill_number,
            "bill_type": b.bill_type,
            "version": b.version,
            "issue_date": b.issue_date.isoformat() if b.issue_date else None,
            "subtotal": b.subtotal,
            "discount": b.discount,
            "tax_rate": b.tax_rate,
            "cgst_amount": b.cgst_amount,
            "sgst_amount": b.sgst_amount,
            "igst_amount": b.igst_amount,
            "delivery_charge": b.delivery_charge,
            "final_total": b.final_total,
            "payment_status": b.payment_status,
            "payment_method": b.payment_method,
            "vendor_gstin": b.vendor_gstin,
            "has_pdf": bool(b.pdf_path and os.path.exists(b.pdf_path))
        })

    vendor_info = {
        "phone": order.vendor_phone,
        "name": order.vendor_rel.shop_name or order.vendor_rel.name if order.vendor_rel else "Local Store",
        "category": order.vendor_rel.category if order.vendor_rel else "Grocery"
    }

    return {
        "id": order.id,
        "customer_phone": order.customer_phone,
        "customer_name": order.customer_name,
        "customer_address": order.customer_address,
        "vendor": vendor_info,
        "request_type": order.request_type,
        "raw_text": order.raw_text,
        "has_image": bool(order.image_path and os.path.exists(order.image_path)),
        "notes": order.notes,
        "status": order.status,
        "price_status": order.price_status,
        "subtotal": order.subtotal,
        "discount": order.discount,
        "tax_amount": order.tax_amount,
        "delivery_charge": order.delivery_charge,
        "total_amount": order.total_amount,
        "stock_deducted": order.stock_deducted,
        "delivery_notification_status": order.delivery_notification_status,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "updated_at": order.updated_at.isoformat() if order.updated_at else None,
        "items": items_out,
        "bills": bills_out
    }


# =========================================================================
# A. CUSTOMER ORDERING ENDPOINTS
# =========================================================================

@router.post("/customer/orders")
async def place_customer_order(
    request: Request,
    file: Optional[UploadFile] = File(None),
    order_data: Optional[str] = Form(None),
    current_customer: Optional[Customer] = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """
    Places a new customer order.
    Supports cart items, free-text shopping requests, and handwritten photo uploads.
    """
    raw_payload: Dict[str, Any] = {}

    content_type = request.headers.get("content-type", "").lower()
    if "application/json" in content_type:
        try:
            raw_payload = await request.json()
        except Exception:
            pass
    elif order_data:
        try:
            raw_payload = json.loads(order_data)
        except Exception:
            pass

    vendor_raw = raw_payload.get("vendor_phone")
    if not vendor_raw:
        # Fallback to first vendor in DB if unassigned
        first_v = db.query(Vendor).first()
        if not first_v:
            raise HTTPException(status_code=400, detail="No shop vendor available to receive orders.")
        vendor_phone = first_v.phone
    else:
        vendor_phone = normalize_phone(vendor_raw)

    vendor = db.query(Vendor).filter_by(phone=vendor_phone).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Selected vendor shop not found.")

    cust_phone = current_customer.phone if current_customer else raw_payload.get("customer_phone", "")
    cust_name = (
        raw_payload.get("customer_name")
        or (current_customer.name if current_customer else "Walk-in Customer")
    )
    cust_addr = (
        raw_payload.get("customer_address")
        or (current_customer.address if current_customer else "")
    )

    request_type = raw_payload.get("request_type", "cart")
    notes = raw_payload.get("notes")
    raw_text = raw_payload.get("raw_text")

    # Handle image upload if provided
    saved_image_path: Optional[str] = None
    if file:
        filename = file.filename or "upload.png"
        ext = os.path.splitext(filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"File extension {ext} not permitted.")

        file_bytes = await file.read()
        if len(file_bytes) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="Uploaded file exceeds 10MB limit.")

        unique_filename = f"{uuid.uuid4().hex}{ext}"
        target_path = UPLOADS_ORDERS_DIR / unique_filename
        with open(target_path, "wb") as f:
            f.write(file_bytes)
        saved_image_path = str(target_path)
        request_type = "image_list"

        # Attempt heuristic text extraction from the uploaded shopping list / receipt
        if not raw_text:
            try:
                decoded = file_bytes.decode("utf-8", errors="ignore")
                if len(decoded.strip()) > 10:
                    raw_text = decoded
            except Exception:
                pass

    order_id = generate_unique_order_id()
    new_order = Order(
        id=order_id,
        customer_phone=cust_phone if cust_phone else None,
        customer_name=cust_name,
        customer_address=cust_addr,
        vendor_phone=vendor.phone,
        request_type=request_type,
        raw_text=raw_text,
        image_path=saved_image_path,
        notes=notes,
        status="New",
        price_status="pending",
        created_at=get_ist_now(),
        updated_at=get_ist_now()
    )
    db.add(new_order)
    db.flush()

    # Process items
    incoming_items = raw_payload.get("items") or []
    has_unpriced = False
    subtotal = 0.0

    if incoming_items:
        for it in incoming_items:
            p_name = it.get("product_name") or it.get("name") or "Item"
            qty = float(it.get("qty", 1.0))
            unit = it.get("unit", "pcs")

            price_info = identify_and_price_item(
                db=db,
                vendor_phone=vendor.phone,
                product_name=p_name,
                requested_qty=qty,
                requested_unit=unit
            )

            # If client specifically passed price from public catalogue, honor it unless unconfirmed
            if it.get("unit_price") is not None and price_info["unit_price"] is None:
                price_info["unit_price"] = float(it["unit_price"])
                price_info["line_total"] = round(float(it["unit_price"]) * qty, 2)
                price_info["price_source"] = "manual_quote"

            if price_info["unit_price"] is None:
                has_unpriced = True
            else:
                subtotal += price_info["line_total"]

            order_item = OrderItem(
                order_id=new_order.id,
                item_id=price_info.get("item_id"),
                product_name=price_info["product_name"],
                unit=price_info["unit"],
                qty=qty,
                unit_price=price_info["unit_price"],
                line_total=price_info["line_total"],
                price_source=price_info["price_source"],
                reference_note=price_info["reference_note"],
                reference_confidence=price_info["reference_confidence"],
                in_stock=price_info["in_stock"],
                current_inventory_qty=price_info["current_inventory_qty"],
                is_confirmed_by_vendor=price_info["is_confirmed_by_vendor"]
            )
            db.add(order_item)

    elif raw_text:
        # Heuristic parse lines from raw text notes or shopping list
        parsed = parse_full_bill_text(raw_text)
        parsed_items = parsed.get("items", [])
        if parsed_items:
            for it in parsed_items:
                p_name = it.get("name", "Item")
                qty = float(it.get("qty", 1.0))
                unit = it.get("unit", "pcs")

                price_info = identify_and_price_item(
                    db=db,
                    vendor_phone=vendor.phone,
                    product_name=p_name,
                    requested_qty=qty,
                    requested_unit=unit
                )

                if price_info["unit_price"] is None:
                    has_unpriced = True
                else:
                    subtotal += price_info["line_total"]

                order_item = OrderItem(
                    order_id=new_order.id,
                    item_id=price_info.get("item_id"),
                    product_name=price_info["product_name"],
                    unit=price_info["unit"],
                    qty=qty,
                    unit_price=price_info["unit_price"],
                    line_total=price_info["line_total"],
                    price_source=price_info["price_source"],
                    reference_note=price_info["reference_note"],
                    reference_confidence=price_info["reference_confidence"],
                    in_stock=price_info["in_stock"],
                    current_inventory_qty=price_info["current_inventory_qty"],
                    is_confirmed_by_vendor=False
                )
                db.add(order_item)
        else:
            has_unpriced = True

    if has_unpriced or not incoming_items:
        new_order.status = "Awaiting Price"
        new_order.price_status = "pending"
    else:
        new_order.status = "New"
        new_order.price_status = "pending"

    new_order.subtotal = round(subtotal, 2)
    new_order.total_amount = round(subtotal, 2)
    db.commit()
    db.refresh(new_order)

    # Broadcast event via SSE so vendor dashboard updates immediately
    try:
        broadcaster.publish({
            "type": "order_created",
            "order_id": new_order.id,
            "vendor": new_order.vendor_phone,
            "customer_name": new_order.customer_name,
            "status": new_order.status,
            "total": new_order.total_amount
        })
    except Exception:
        pass

    return {
        "success": True,
        "message": f"Order {new_order.id} placed successfully!",
        "order": serialize_order(new_order)
    }


@router.get("/customer/orders")
def get_customer_orders(
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Returns list of all orders placed by the currently logged-in customer."""
    orders = (
        db.query(Order)
        .filter_by(customer_phone=current_customer.phone)
        .order_by(Order.created_at.desc())
        .all()
    )
    return {
        "success": True,
        "total": len(orders),
        "orders": [serialize_order(o) for o in orders]
    }


@router.get("/customer/orders/{order_id}")
def get_customer_order_detail(
    order_id: str,
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Gets order details and status for the customer."""
    order = db.query(Order).filter_by(id=order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.customer_phone != current_customer.phone:
        raise HTTPException(status_code=403, detail="Unauthorized access to this order.")

    return {
        "success": True,
        "order": serialize_order(order)
    }


@router.post("/customer/orders/{order_id}/approve")
def customer_approve_quote(
    order_id: str,
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Customer approves the vendor's price quotation, confirming the order."""
    order = db.query(Order).filter_by(id=order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.customer_phone != current_customer.phone:
        raise HTTPException(status_code=403, detail="Unauthorized access to this order.")

    if order.status not in ["Quote Sent", "Awaiting Customer Approval", "Reviewing"]:
        raise HTTPException(status_code=400, detail=f"Cannot approve order in current status '{order.status}'.")

    order.status = "Confirmed"
    order.price_status = "confirmed"
    order.updated_at = get_ist_now()

    # Deduct stock on confirmation in an atomic transaction
    deduct_order_stock_transactional(db, order)
    db.commit()

    # Broadcast update
    try:
        broadcaster.publish({
            "type": "order_updated",
            "order_id": order.id,
            "vendor": order.vendor_phone,
            "status": order.status
        })
    except Exception:
        pass

    return {
        "success": True,
        "message": "Quotation approved! Order confirmed and sent to shopkeeper for preparation.",
        "order": serialize_order(order)
    }


@router.post("/customer/orders/{order_id}/cancel")
def customer_cancel_order(
    order_id: str,
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Customer cancels their order."""
    order = db.query(Order).filter_by(id=order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.customer_phone != current_customer.phone:
        raise HTTPException(status_code=403, detail="Unauthorized access to this order.")

    if order.status in ["Completed", "Cancelled"]:
        raise HTTPException(status_code=400, detail=f"Order is already {order.status}.")

    order.status = "Cancelled"
    order.updated_at = get_ist_now()

    # Restore stock if previously deducted
    restore_order_stock_transactional(db, order)
    db.commit()

    return {
        "success": True,
        "message": "Order has been cancelled.",
        "order": serialize_order(order)
    }


# =========================================================================
# B. VENDOR ORDER MANAGEMENT & WORKSPACE ENDPOINTS
# =========================================================================

@router.get("/vendor/orders")
def get_vendor_orders(
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """
    Returns incoming customer requests for the authenticated vendor.
    Enforces multi-tenant isolation: only returns this vendor's orders.
    """
    query = db.query(Order).filter_by(vendor_phone=current_vendor.phone)

    if status and status != "all":
        query = query.filter_by(status=status)

    if search and search.strip():
        st = f"%{search.strip()}%"
        query = query.filter(
            (Order.id.ilike(st)) |
            (Order.customer_name.ilike(st)) |
            (Order.customer_phone.ilike(st))
        )

    orders = query.order_by(Order.created_at.desc()).all()
    return {
        "success": True,
        "total": len(orders),
        "orders": [serialize_order(o) for o in orders]
    }


@router.get("/vendor/orders/{order_id}")
def get_vendor_order_detail(
    order_id: str,
    current_vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Gets complete order detail for the vendor workspace."""
    order = db.query(Order).filter_by(id=order_id, vendor_phone=current_vendor.phone).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found in your shop workspace.")

    return {
        "success": True,
        "order": serialize_order(order)
    }


@router.put("/vendor/orders/{order_id}/items")
def update_vendor_order_items(
    order_id: str,
    payload: UpdateOrderItemsRequest,
    current_vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """
    Vendor updates items in the order: adds new items, changes quantity,
    adjusts rates, and confirms item availability.
    """
    order = db.query(Order).filter_by(id=order_id, vendor_phone=current_vendor.phone).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    # Remove previous items
    db.query(OrderItem).filter_by(order_id=order.id).delete()

    subtotal = 0.0
    has_unpriced = False

    for it in payload.items:
        p_name = it.product_name.strip()
        qty = float(it.qty)
        unit = it.unit or "pcs"
        u_price = float(it.unit_price) if it.unit_price is not None else None

        # Check vendor item
        matched_item = None
        if it.item_id:
            matched_item = db.query(Item).filter_by(id=it.item_id, vendor=current_vendor.phone).first()
        if not matched_item:
            from app.services.inventory_service import find_vendor_item
            matched_item = find_vendor_item(db, current_vendor.phone, p_name)

        avail_qty = float(matched_item.qty) if matched_item else 0.0
        in_stock = avail_qty >= qty if matched_item else False

        if u_price is None and matched_item and matched_item.price is not None:
            u_price = float(matched_item.price)

        line_tot = round(u_price * qty, 2) if u_price is not None else 0.0
        if u_price is None:
            has_unpriced = True
        else:
            subtotal += line_tot

        new_it = OrderItem(
            order_id=order.id,
            item_id=matched_item.id if matched_item else None,
            product_name=p_name,
            unit=unit,
            qty=qty,
            unit_price=u_price,
            line_total=line_tot,
            price_source="vendor" if (matched_item and matched_item.price == u_price) else "manual_quote",
            in_stock=in_stock,
            current_inventory_qty=avail_qty,
            is_confirmed_by_vendor=True
        )
        db.add(new_it)

    order.subtotal = round(subtotal, 2)
    order.total_amount = round(subtotal, 2)
    if payload.notes:
        order.notes = payload.notes

    if has_unpriced:
        order.status = "Awaiting Price"
    elif order.status == "New":
        order.status = "Reviewing"

    order.updated_at = get_ist_now()
    db.commit()
    db.refresh(order)

    return {
        "success": True,
        "message": "Order items updated successfully.",
        "order": serialize_order(order)
    }


@router.post("/vendor/orders/{order_id}/send-quote")
def send_vendor_quotation(
    order_id: str,
    payload: SendQuotationRequest,
    current_vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """
    Submits quotation to the customer.
    Creates a draft quotation bill, calculates totals, updates order status to 'Quote Sent',
    and dispatches notification via messaging integration.
    """
    order = db.query(Order).filter_by(id=order_id, vendor_phone=current_vendor.phone).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    if not order.items:
        raise HTTPException(status_code=400, detail="Cannot send quote: no items in order.")

    for it in order.items:
        if it.unit_price is None:
            raise HTTPException(
                status_code=400,
                detail=f"Item '{it.product_name}' has no price. Please enter a price before sending quotation."
            )

    # Decimal-safe calculation
    items_for_calc = [
        {"product_name": it.product_name, "qty": it.qty, "unit": it.unit, "unit_price": it.unit_price}
        for it in order.items
    ]
    calc = calculate_bill_totals(
        items=items_for_calc,
        discount_val=payload.discount,
        tax_rate_val=payload.tax_rate,
        delivery_charge_val=payload.delivery_charge
    )

    bill_number = generate_sequential_bill_number(db, bill_type="quotation")
    issue_date = get_ist_now()

    # Determine revision version
    latest_bill = db.query(Bill).filter_by(order_id=order.id).order_by(Bill.version.desc()).first()
    version = (latest_bill.version + 1) if latest_bill else 1

    # Generate PDF
    pdf_bytes = generate_invoice_pdf(
        bill_number=bill_number,
        bill_type="quotation",
        issue_date=issue_date,
        order_id=order.id,
        vendor_data={
            "shop_name": current_vendor.shop_name,
            "name": current_vendor.name,
            "phone": current_vendor.phone,
            "address": getattr(current_vendor, "address", "Pune, MH"),
            "gstin": getattr(current_vendor, "gstin", None)
        },
        customer_data={
            "name": order.customer_name,
            "phone": order.customer_phone,
            "address": order.customer_address
        },
        totals_data=calc,
        payment_status="unpaid",
        version=version
    )

    pdf_file_path = UPLOADS_BILLS_DIR / f"{bill_number}.pdf"
    with open(pdf_file_path, "wb") as f:
        f.write(pdf_bytes)

    # Create bill record
    bill = Bill(
        bill_number=bill_number,
        order_id=order.id,
        vendor_phone=current_vendor.phone,
        customer_phone=order.customer_phone,
        bill_type="quotation",
        version=version,
        issue_date=issue_date,
        subtotal=calc["subtotal"],
        discount=calc["discount"],
        tax_rate=calc["tax_rate"],
        cgst_amount=calc["cgst"],
        sgst_amount=calc["sgst"],
        igst_amount=calc["igst"],
        delivery_charge=calc["delivery_charge"],
        final_total=calc["final_total"],
        payment_status="unpaid",
        items_json=json.dumps(calc["items"], ensure_ascii=False),
        notes=payload.notes,
        pdf_path=str(pdf_file_path),
        created_at=issue_date
    )
    db.add(bill)

    # Update order state
    order.status = "Quote Sent"
    order.price_status = "quoted"
    order.subtotal = calc["subtotal"]
    order.discount = calc["discount"]
    order.tax_amount = calc["total_tax"]
    order.delivery_charge = calc["delivery_charge"]
    order.total_amount = calc["final_total"]
    order.updated_at = issue_date

    # Dispatch notification to customer
    if order.customer_phone:
        msg_body = (
            f"Hello {order.customer_name}, {current_vendor.shop_name or 'your shopkeeper'} "
            f"has sent a price quotation for Order {order.id}.\n"
            f"Total Amount: ₹{calc['final_total']:.2f}\n"
            f"Please review and approve in your SmartStock Customer Portal."
        )
        notif_res = send_whatsapp_or_sms_notification(order.customer_phone, msg_body)
        order.delivery_notification_status = notif_res.get("status", "skipped")
        order.delivery_notification_log = log_notification_event(
            order.delivery_notification_log,
            {
                "event": "quotation_sent",
                "bill_number": bill_number,
                "amount": calc["final_total"],
                **notif_res
            }
        )

    db.commit()
    db.refresh(order)

    # Broadcast update
    try:
        broadcaster.publish({
            "type": "order_updated",
            "order_id": order.id,
            "vendor": order.vendor_phone,
            "status": order.status,
            "bill_number": bill_number
        })
    except Exception:
        pass

    return {
        "success": True,
        "message": f"Quotation {bill_number} sent to customer!",
        "bill_number": bill_number,
        "order": serialize_order(order)
    }


@router.post("/vendor/orders/{order_id}/generate-bill")
def generate_vendor_final_bill(
    order_id: str,
    payload: GenerateBillRequest,
    current_vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """
    Generates the final Tax Invoice bill for the order.
    Revalidates decimal arithmetic, deducts stock if not yet deducted,
    creates PDF invoice, and saves audit trail.
    """
    order = db.query(Order).filter_by(id=order_id, vendor_phone=current_vendor.phone).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    if not order.items:
        raise HTTPException(status_code=400, detail="Cannot generate bill: order contains no items.")

    for it in order.items:
        if it.unit_price is None:
            raise HTTPException(
                status_code=400,
                detail=f"Item '{it.product_name}' has no price. Set a confirmed price before issuing the final bill."
            )

    # Decimal-safe arithmetic
    items_for_calc = [
        {"product_name": it.product_name, "qty": it.qty, "unit": it.unit, "unit_price": it.unit_price}
        for it in order.items
    ]
    calc = calculate_bill_totals(
        items=items_for_calc,
        discount_val=payload.discount,
        tax_rate_val=payload.tax_rate,
        delivery_charge_val=payload.delivery_charge
    )

    bill_number = generate_sequential_bill_number(db, bill_type=payload.bill_type)
    issue_date = get_ist_now()

    latest_bill = db.query(Bill).filter_by(order_id=order.id).order_by(Bill.version.desc()).first()
    version = (latest_bill.version + 1) if latest_bill else 1

    pdf_bytes = generate_invoice_pdf(
        bill_number=bill_number,
        bill_type=payload.bill_type,
        issue_date=issue_date,
        order_id=order.id,
        vendor_data={
            "shop_name": current_vendor.shop_name,
            "name": current_vendor.name,
            "phone": current_vendor.phone,
            "address": getattr(current_vendor, "address", "Pune, MH"),
            "gstin": getattr(current_vendor, "gstin", None)
        },
        customer_data={
            "name": order.customer_name,
            "phone": order.customer_phone,
            "address": order.customer_address
        },
        totals_data=calc,
        payment_status="unpaid",
        version=version
    )

    pdf_file_path = UPLOADS_BILLS_DIR / f"{bill_number}.pdf"
    with open(pdf_file_path, "wb") as f:
        f.write(pdf_bytes)

    bill = Bill(
        bill_number=bill_number,
        order_id=order.id,
        vendor_phone=current_vendor.phone,
        customer_phone=order.customer_phone,
        bill_type=payload.bill_type,
        version=version,
        issue_date=issue_date,
        subtotal=calc["subtotal"],
        discount=calc["discount"],
        tax_rate=calc["tax_rate"],
        cgst_amount=calc["cgst"],
        sgst_amount=calc["sgst"],
        igst_amount=calc["igst"],
        delivery_charge=calc["delivery_charge"],
        final_total=calc["final_total"],
        payment_status="unpaid",
        payment_method=payload.payment_method,
        vendor_gstin=getattr(current_vendor, "gstin", None),
        items_json=json.dumps(calc["items"], ensure_ascii=False),
        notes=payload.notes,
        pdf_path=str(pdf_file_path),
        created_at=issue_date
    )
    db.add(bill)

    order.subtotal = calc["subtotal"]
    order.discount = calc["discount"]
    order.tax_amount = calc["total_tax"]
    order.delivery_charge = calc["delivery_charge"]
    order.total_amount = calc["final_total"]
    order.status = "Confirmed"
    order.price_status = "confirmed"
    order.updated_at = issue_date

    # Deduct stock on final confirmation in atomic transaction
    deduct_order_stock_transactional(db, order)

    # Dispatch notification to customer
    if order.customer_phone:
        msg_body = (
            f"Invoice #{bill_number} generated by {current_vendor.shop_name or 'your shopkeeper'}.\n"
            f"Total Payable: ₹{calc['final_total']:.2f}\n"
            f"You can view and download your invoice in your SmartStock Customer Portal."
        )
        notif_res = send_whatsapp_or_sms_notification(order.customer_phone, msg_body)
        order.delivery_notification_status = notif_res.get("status", "skipped")
        order.delivery_notification_log = log_notification_event(
            order.delivery_notification_log,
            {
                "event": "invoice_generated",
                "bill_number": bill_number,
                "amount": calc["final_total"],
                **notif_res
            }
        )

    db.commit()
    db.refresh(order)

    return {
        "success": True,
        "message": f"Bill {bill_number} generated successfully!",
        "bill_number": bill_number,
        "order": serialize_order(order)
    }


@router.post("/vendor/orders/{order_id}/update-status")
def update_vendor_order_status(
    order_id: str,
    payload: UpdateStatusRequest,
    current_vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """
    Updates the lifecycle status of an order:
    New, Reviewing, Awaiting Price, Quote Sent, Confirmed, Preparing, Completed, Cancelled.
    Handles atomic stock deduction and restoration safely.
    """
    order = db.query(Order).filter_by(id=order_id, vendor_phone=current_vendor.phone).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    valid_statuses = [
        "New", "Reviewing", "Awaiting Price", "Quote Sent",
        "Awaiting Customer Approval", "Confirmed", "Preparing",
        "Completed", "Cancelled"
    ]
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status '{payload.status}'.")

    old_status = order.status
    order.status = payload.status
    if payload.notes:
        order.notes = payload.notes
    order.updated_at = get_ist_now()

    # If transitioning to Confirmed or Preparing, ensure stock is deducted
    if payload.status in ["Confirmed", "Preparing"]:
        deduct_order_stock_transactional(db, order)

    # If cancelled, restore stock
    if payload.status == "Cancelled" and old_status != "Cancelled":
        restore_order_stock_transactional(db, order)

    db.commit()
    db.refresh(order)

    # Broadcast update
    try:
        broadcaster.publish({
            "type": "order_updated",
            "order_id": order.id,
            "vendor": order.vendor_phone,
            "status": order.status
        })
    except Exception:
        pass

    return {
        "success": True,
        "message": f"Order status updated to '{order.status}'.",
        "order": serialize_order(order)
    }


@router.post("/vendor/orders/{order_id}/mark-paid")
def mark_vendor_order_paid(
    order_id: str,
    current_vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Marks the latest bill and order as paid."""
    order = db.query(Order).filter_by(id=order_id, vendor_phone=current_vendor.phone).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    order.price_status = "paid"
    for b in order.bills:
        b.payment_status = "paid"

    order.updated_at = get_ist_now()
    db.commit()

    return {
        "success": True,
        "message": f"Order {order.id} marked as Paid.",
        "order": serialize_order(order)
    }


# =========================================================================
# C. SECURE DOWNLOAD & IMAGE VIEW ENDPOINTS (Protected from public guessing)
# =========================================================================

@router.get("/orders/{order_id}/download-pdf")
def download_order_pdf(
    order_id: str,
    bill_number: Optional[str] = None,
    user: Any = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Securely serves PDF for an order's quotation or invoice.
    Requires server-side authorization check: only authorized customer or shop owner can access.
    """
    order = db.query(Order).filter_by(id=order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    # Authorization verification
    authorized = False
    if user:
        user_phone = user.get("phone") if isinstance(user, dict) else getattr(user, "phone", None)
        if user_phone and (user_phone == order.vendor_phone or user_phone == order.customer_phone):
            authorized = True

    if not authorized:
        raise HTTPException(
            status_code=403,
            detail="Forbidden. Only the shopkeeper or the customer who placed this order may download its bill."
        )

    # Locate bill
    bill_query = db.query(Bill).filter_by(order_id=order.id)
    if bill_number:
        bill = bill_query.filter_by(bill_number=bill_number).first()
    else:
        bill = bill_query.order_by(Bill.version.desc()).first()

    if not bill or not bill.pdf_path or not os.path.exists(bill.pdf_path):
        raise HTTPException(status_code=404, detail="Bill PDF has not been generated for this order.")

    return FileResponse(
        bill.pdf_path,
        media_type="application/pdf",
        filename=f"{bill.bill_number}.pdf"
    )


@router.get("/orders/{order_id}/image")
def get_order_uploaded_image(
    order_id: str,
    user: Any = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Securely serves customer uploaded shopping list photo.
    Verifies that caller is either the shopkeeper or the customer who placed the order.
    """
    order = db.query(Order).filter_by(id=order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    authorized = False
    if user:
        user_phone = user.get("phone") if isinstance(user, dict) else getattr(user, "phone", None)
        if user_phone and (user_phone == order.vendor_phone or user_phone == order.customer_phone):
            authorized = True

    if not authorized:
        raise HTTPException(
            status_code=403,
            detail="Forbidden. Only authorized shopkeepers or customers may view uploaded order documents."
        )

    if not order.image_path or not os.path.exists(order.image_path):
        raise HTTPException(status_code=404, detail="No uploaded image attached to this order.")

    ext = os.path.splitext(order.image_path)[1].lower()
    media_map = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".pdf": "application/pdf"
    }
    return FileResponse(order.image_path, media_type=media_map.get(ext, "image/jpeg"))
