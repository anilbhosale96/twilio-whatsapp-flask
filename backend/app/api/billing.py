import os
import io
import json
import uuid
import secrets
from decimal import Decimal
from typing import Optional, List, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, func, text

from app.core.database import get_db
from app.core.time_utils import get_ist_now
from app.core.auth_dependency import get_current_vendor, get_current_customer, get_optional_user
from app.core.auth_security import hash_password
from app.models.vendor import Vendor
from app.models.customer import Customer
from app.models.item import Item
from app.models.transaction import Transaction
from app.models.bill import Bill
from app.services.pdf_generator import calculate_bill_totals, generate_invoice_pdf
from app.services.notification_service import send_whatsapp_or_sms_notification, log_notification_event
from app.services.broadcaster import broadcaster

router = APIRouter(prefix="/api", tags=["Vendor Billing & Invoicing"])

BILLS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "bills")
os.makedirs(BILLS_DIR, exist_ok=True)


# --- Schemas ---

class CustomerCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., min_length=7, max_length=32)
    address: Optional[str] = None
    city: Optional[str] = "Pune"
    email: Optional[str] = None


class BillItemInput(BaseModel):
    item_id: Optional[int] = None
    product_name: str
    qty: float = Field(..., gt=0)
    unit: str = "pcs"
    unit_price: float = Field(..., ge=0)
    barcode: Optional[str] = None
    sku: Optional[str] = None
    discount: float = 0.0
    tax_rate: float = 0.0


class BillCreateRequest(BaseModel):
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    bill_type: str = "invoice"  # "invoice" or "quotation"
    status: str = "finalized"   # "draft" or "finalized"
    items: List[BillItemInput]
    discount: float = 0.0
    tax_rate: float = 0.0
    delivery_charge: float = 0.0
    payment_status: str = "unpaid"  # "unpaid", "paid", "partially_paid"
    payment_method: Optional[str] = "Cash"  # "Cash", "UPI", "Card", "Credit"
    amount_paid: float = 0.0
    delivery_channel: Optional[str] = None  # "whatsapp", "sms"
    notes: Optional[str] = None


class RecordPaymentRequest(BaseModel):
    amount: float = Field(..., gt=0)
    payment_method: str = "Cash"
    notes: Optional[str] = None


class SendBillRequest(BaseModel):
    channel: str = "whatsapp"  # "whatsapp" or "sms"
    recipient_phone: Optional[str] = None


# --- Helper functions ---

def generate_sequential_bill_number(db: Session, vendor_phone: str, bill_type: str = "invoice") -> str:
    """Generates sequential, collision-resistant bill number: INV-YYYYMMDD-XXXX."""
    today_str = get_ist_now().strftime("%Y%m%d")
    prefix = "INV" if bill_type == "invoice" else "QTE"

    # Count today's bills for this vendor
    count = db.query(func.count(Bill.id)).filter(
        Bill.vendor_phone == vendor_phone,
        Bill.bill_number.like(f"{prefix}-{today_str}-%")
    ).scalar() or 0

    seq = count + 1
    # Check for uniqueness, increment if collision
    while True:
        candidate = f"{prefix}-{today_str}-{seq:04d}"
        exists = db.query(Bill.id).filter(Bill.bill_number == candidate).first()
        if not exists:
            return candidate
        seq += 1


def clean_phone_number(p: Optional[str]) -> str:
    if not p:
        return ""
    clean = p.replace("whatsapp:", "").replace(" ", "").replace("-", "").strip()
    if clean and not clean.startswith("+"):
        if len(clean) == 10:
            clean = f"+91{clean}"
        else:
            clean = f"+{clean}"
    return clean


# --- 1. Customer Selection & Creation ---

@router.get("/vendor/customers")
def get_vendor_customers(
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    current_vendor: Vendor = Depends(get_current_vendor)
):
    """
    Search and list customers by name or phone number.
    Aggregates registered customers and customers from historical bills.
    """
    query = db.query(Customer)
    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.filter(or_(Customer.name.ilike(term), Customer.phone.ilike(term)))

    registered_customers = query.order_by(Customer.name.asc()).limit(50).all()

    # Also find customer names/phones recorded on previous bills of this vendor
    bill_query = db.query(
        Bill.customer_phone,
        Bill.customer_name,
        Bill.customer_address
    ).filter(
        Bill.vendor_phone == current_vendor.phone,
        Bill.customer_phone.isnot(None)
    ).distinct()

    if q and q.strip():
        term = f"%{q.strip()}%"
        bill_query = bill_query.filter(
            or_(Bill.customer_name.ilike(term), Bill.customer_phone.ilike(term))
        )

    bill_customers = bill_query.limit(50).all()

    combined: Dict[str, Dict[str, Any]] = {}

    for c in registered_customers:
        clean = clean_phone_number(c.phone)
        combined[clean] = {
            "name": c.name,
            "phone": clean,
            "address": c.address or c.city or "",
            "is_registered": True
        }

    for b in bill_customers:
        clean = clean_phone_number(b.customer_phone)
        if clean not in combined:
            combined[clean] = {
                "name": b.customer_name or "Customer",
                "phone": clean,
                "address": b.customer_address or "",
                "is_registered": False
            }

    return {
        "success": True,
        "customers": list(combined.values())
    }


@router.post("/vendor/customers")
def create_or_update_customer(
    req: CustomerCreateRequest,
    db: Session = Depends(get_db),
    current_vendor: Vendor = Depends(get_current_vendor)
):
    """
    Creates or updates a customer record.
    Prevents duplicate phone numbers.
    """
    clean_phone = clean_phone_number(req.phone)
    if len(clean_phone) < 8:
        raise HTTPException(status_code=400, detail="Invalid phone number format.")

    customer = db.query(Customer).filter(
        or_(
            Customer.phone == clean_phone,
            Customer.phone == f"whatsapp:{clean_phone}"
        )
    ).first()

    if customer:
        customer.name = req.name.strip()
        if req.address:
            customer.address = req.address.strip()
        if req.city:
            customer.city = req.city.strip()
        if req.email:
            customer.email = req.email.strip()
        db.commit()
        db.refresh(customer)
        action = "updated"
    else:
        customer = Customer(
            phone=clean_phone,
            name=req.name.strip(),
            email=req.email.strip() if req.email else None,
            city=req.city or "Pune",
            address=req.address.strip() if req.address else None,
            password_hash=hash_password("smartstock123")  # Default password for vendor-created customer
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)
        action = "created"

    return {
        "success": True,
        "message": f"Customer '{customer.name}' successfully {action}.",
        "customer": {
            "name": customer.name,
            "phone": customer.phone,
            "address": customer.address,
            "city": customer.city,
            "email": customer.email
        }
    }


# --- 2. Vendor Bill Creation & Management ---

@router.post("/vendor/bills")
def create_bill(
    req: BillCreateRequest,
    db: Session = Depends(get_db),
    current_vendor: Vendor = Depends(get_current_vendor)
):
    """
    Creates a new bill (draft or finalized).
    - If status == 'finalized': deducts stock atomically in DB transaction, logs OUT transaction, generates PDF.
    - If status == 'draft': stock is untouched.
    """
    if not req.items:
        raise HTTPException(status_code=400, detail="Bill must have at least one product.")

    clean_phone = clean_phone_number(req.customer_phone)

    # 1. Fetch vendor inventory items to validate stock and prices
    items_to_process = []
    for it in req.items:
        db_item = None
        if it.item_id:
            db_item = db.query(Item).filter(
                Item.id == it.item_id,
                Item.vendor == current_vendor.phone
            ).first()

        if not db_item and it.barcode:
            db_item = db.query(Item).filter(
                Item.barcode == it.barcode,
                Item.vendor == current_vendor.phone
            ).first()

        if not db_item:
            db_item = db.query(Item).filter(
                Item.name.ilike(it.product_name),
                Item.vendor == current_vendor.phone
            ).first()

        # If finalized, check stock availability
        if req.status == "finalized":
            if db_item and db_item.qty < it.qty:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock for '{it.product_name}'. Available: {db_item.qty} {db_item.unit}, Requested: {it.qty} {it.unit}."
                )

        items_to_process.append({
            "item_id": db_item.id if db_item else None,
            "product_name": it.product_name,
            "qty": it.qty,
            "unit": it.unit or (db_item.unit if db_item else "pcs"),
            "unit_price": it.unit_price,
            "barcode": it.barcode or (db_item.barcode if db_item else None),
            "sku": it.sku or (db_item.sku if db_item else None),
            "line_total": round(it.qty * it.unit_price, 2)
        })

    # 2. Decimal-safe calculation
    calc = calculate_bill_totals(
        items=[{"qty": i["qty"], "unit_price": i["unit_price"], "product_name": i["product_name"], "unit": i["unit"]} for i in items_to_process],
        discount_val=req.discount,
        tax_rate_val=req.tax_rate,
        delivery_charge_val=req.delivery_charge
    )

    final_total = calc["final_total"]
    amount_paid = min(req.amount_paid, final_total) if req.payment_status in ["paid", "partially_paid"] else 0.0
    if req.payment_status == "paid":
        amount_paid = final_total
    balance_due = max(0.0, final_total - amount_paid)

    bill_number = generate_sequential_bill_number(db, current_vendor.phone, req.bill_type)
    access_token = secrets.token_urlsafe(32)
    order_ref = f"DIR-{bill_number}"

    bill = Bill(
        bill_number=bill_number,
        order_id=order_ref,
        vendor_phone=current_vendor.phone,
        customer_phone=clean_phone or None,
        customer_name=req.customer_name or "Walk-in Customer",
        customer_address=req.customer_address or None,
        bill_type=req.bill_type,
        status=req.status,
        subtotal=calc["subtotal"],
        discount=calc["discount"],
        tax_rate=calc["tax_rate"],
        cgst_amount=calc["cgst"],
        sgst_amount=calc["sgst"],
        igst_amount=calc["igst"],
        delivery_charge=calc["delivery_charge"],
        final_total=final_total,
        payment_status=req.payment_status,
        payment_method=req.payment_method if amount_paid > 0 else None,
        amount_paid=amount_paid,
        balance_due=balance_due,
        delivery_channel=req.delivery_channel,
        delivery_status="pending",
        stock_deducted=False,
        access_token=access_token,
        vendor_gstin=current_vendor.gstin,
        items_json=json.dumps(items_to_process, ensure_ascii=False),
        notes=req.notes,
        created_at=get_ist_now(),
        updated_at=get_ist_now()
    )
    db.add(bill)
    db.flush()

    # 3. If Finalized, deduct stock atomically and record transactions
    if req.status == "finalized":
        batch_id = str(uuid.uuid4())
        for it in items_to_process:
            if it["item_id"]:
                inv_item = db.query(Item).filter(Item.id == it["item_id"]).first()
                if inv_item:
                    inv_item.qty = max(0.0, inv_item.qty - it["qty"])
                    inv_item.updated_at = get_ist_now()

            # Record sales transaction for reports and analytics
            txn = Transaction(
                batch_id=batch_id,
                vendor=current_vendor.phone,
                item_name=it["product_name"],
                unit=it["unit"],
                change=-it["qty"],
                price=it["unit_price"],
                raw_text=f"Sold {it['qty']} {it['unit']} of {it['product_name']} via Bill #{bill.bill_number}",
                created_at=get_ist_now(),
                undone=False
            )
            db.add(txn)

        bill.stock_deducted = True

    # 4. Generate PDF
    pdf_filename = f"{bill.bill_number}.pdf"
    pdf_filepath = os.path.join(BILLS_DIR, pdf_filename)
    try:
        totals_payload = {
            **calc,
            "amount_paid": amount_paid,
            "balance_due": balance_due,
            "payment_method": req.payment_method
        }
        pdf_bytes = generate_invoice_pdf(
            bill_number=bill.bill_number,
            bill_type=bill.bill_type,
            issue_date=bill.issue_date,
            order_id="",
            vendor_data={
                "shop_name": current_vendor.shop_name,
                "name": current_vendor.name,
                "phone": current_vendor.phone,
                "address": current_vendor.address,
                "gstin": current_vendor.gstin
            },
            customer_data={
                "name": bill.customer_name,
                "phone": bill.customer_phone,
                "address": bill.customer_address
            },
            totals_data=totals_payload,
            payment_status=bill.payment_status,
            version=bill.version
        )
        with open(pdf_filepath, "wb") as f:
            f.write(pdf_bytes)
        bill.pdf_path = pdf_filepath
    except Exception as e:
        print("CREATE_BILL PDF GENERATION FAILED:", type(e), e)

    db.commit()
    db.refresh(bill)

    # 5. Dispatch notification if requested and customer phone is present
    if req.delivery_channel in ["whatsapp", "sms"] and clean_phone:
        secure_pdf_link = f"/api/bills/{bill.id}/pdf?token={bill.access_token}"
        msg = (
            f"Hello {bill.customer_name},\n\n"
            f"Here is your {bill.bill_type.capitalize()} #{bill.bill_number} from {current_vendor.shop_name or 'our store'}.\n"
            f"Total Amount: ₹{bill.final_total:.2f}\n"
            f"Status: {bill.payment_status.upper()}\n"
            f"View & Download PDF: {secure_pdf_link}\n\n"
            f"Thank you for shopping with us!"
        )
        delivery_res = send_whatsapp_or_sms_notification(
            recipient_phone=clean_phone,
            message_text=msg,
            channel=req.delivery_channel
        )
        bill.delivery_status = delivery_res.get("status", "failed")
        if not delivery_res.get("success"):
            bill.delivery_error = delivery_res.get("reason") or delivery_res.get("error")
        db.commit()

    return {
        "success": True,
        "message": f"Bill #{bill.bill_number} {'finalized' if req.status == 'finalized' else 'saved as draft'}.",
        "bill": format_bill_response(bill)
    }


@router.get("/vendor/bills")
def list_vendor_bills(
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_vendor: Vendor = Depends(get_current_vendor)
):
    """Lists bills for the authenticated vendor with status and search filters."""
    query = db.query(Bill).filter(Bill.vendor_phone == current_vendor.phone)

    if status and status.lower() != "all":
        query = query.filter(Bill.status == status)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Bill.bill_number.ilike(term),
                Bill.customer_name.ilike(term),
                Bill.customer_phone.ilike(term)
            )
        )

    total = query.count()
    bills = query.order_by(desc(Bill.created_at)).offset(offset).limit(limit).all()

    return {
        "success": True,
        "total": total,
        "bills": [format_bill_response(b) for b in bills]
    }


@router.get("/vendor/bills/{id}")
def get_vendor_bill_detail(
    id: int,
    db: Session = Depends(get_db),
    current_vendor: Vendor = Depends(get_current_vendor)
):
    """Fetches complete bill detail for vendor with authorization check."""
    bill = db.query(Bill).filter(
        Bill.id == id,
        Bill.vendor_phone == current_vendor.phone
    ).first()

    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found or unauthorized.")

    return {
        "success": True,
        "bill": format_bill_response(bill)
    }


@router.put("/vendor/bills/{id}")
def update_draft_bill(
    id: int,
    req: BillCreateRequest,
    db: Session = Depends(get_db),
    current_vendor: Vendor = Depends(get_current_vendor)
):
    """Updates a draft bill. Cannot update finalized or paid bills."""
    bill = db.query(Bill).filter(
        Bill.id == id,
        Bill.vendor_phone == current_vendor.phone
    ).first()

    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found.")

    if bill.status in ["finalized", "paid"]:
        raise HTTPException(status_code=400, detail="Finalized bills cannot be edited. Please cancel and create a new bill.")

    clean_phone = clean_phone_number(req.customer_phone)

    items_to_process = []
    for it in req.items:
        items_to_process.append({
            "item_id": it.item_id,
            "product_name": it.product_name,
            "qty": it.qty,
            "unit": it.unit,
            "unit_price": it.unit_price,
            "barcode": it.barcode,
            "sku": it.sku,
            "line_total": round(it.qty * it.unit_price, 2)
        })

    calc = calculate_bill_totals(
        items=[{"qty": i["qty"], "unit_price": i["unit_price"], "product_name": i["product_name"], "unit": i["unit"]} for i in items_to_process],
        discount_val=req.discount,
        tax_rate_val=req.tax_rate,
        delivery_charge_val=req.delivery_charge
    )

    bill.customer_name = req.customer_name or bill.customer_name
    bill.customer_phone = clean_phone or bill.customer_phone
    bill.customer_address = req.customer_address or bill.customer_address
    bill.subtotal = calc["subtotal"]
    bill.discount = calc["discount"]
    bill.tax_rate = calc["tax_rate"]
    bill.cgst_amount = calc["cgst"]
    bill.sgst_amount = calc["sgst"]
    bill.igst_amount = calc["igst"]
    bill.delivery_charge = calc["delivery_charge"]
    bill.final_total = calc["final_total"]
    bill.balance_due = calc["final_total"] - bill.amount_paid
    bill.items_json = json.dumps(items_to_process, ensure_ascii=False)
    bill.notes = req.notes
    bill.updated_at = get_ist_now()

    db.commit()
    db.refresh(bill)

    return {
        "success": True,
        "message": f"Draft Bill #{bill.bill_number} updated.",
        "bill": format_bill_response(bill)
    }


@router.post("/vendor/bills/{id}/finalize")
def finalize_bill(
    id: int,
    db: Session = Depends(get_db),
    current_vendor: Vendor = Depends(get_current_vendor)
):
    """
    Finalizes a draft bill: validates stock, deducts stock atomically in DB transaction,
    creates sales transactions for analytics, and compiles the final PDF invoice.
    Prevents duplicate deductions with stock_deducted flag.
    """
    bill = db.query(Bill).filter(
        Bill.id == id,
        Bill.vendor_phone == current_vendor.phone
    ).first()

    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found.")

    if bill.status == "finalized":
        return {
            "success": True,
            "message": "Bill is already finalized.",
            "bill": format_bill_response(bill)
        }

    items = json.loads(bill.items_json)

    # 1. Server-side stock availability validation
    for it in items:
        if it.get("item_id"):
            db_item = db.query(Item).filter(Item.id == it["item_id"], Item.vendor == current_vendor.phone).first()
            if db_item and db_item.qty < it["qty"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot finalize: Insufficient stock for '{it['product_name']}'. Available: {db_item.qty}, Needed: {it['qty']}."
                )

    # 2. Atomic stock deduction
    if not bill.stock_deducted:
        batch_id = str(uuid.uuid4())
        for it in items:
            if it.get("item_id"):
                db_item = db.query(Item).filter(Item.id == it["item_id"]).first()
                if db_item:
                    db_item.qty = max(0.0, db_item.qty - it["qty"])
                    db_item.updated_at = get_ist_now()

            txn = Transaction(
                batch_id=batch_id,
                vendor=current_vendor.phone,
                item_name=it["product_name"],
                unit=it["unit"],
                change=-it["qty"],
                price=it["unit_price"],
                raw_text=f"Sold {it['qty']} {it['unit']} of {it['product_name']} via Bill #{bill.bill_number}",
                created_at=get_ist_now(),
                undone=False
            )
            db.add(txn)

        bill.stock_deducted = True

    bill.status = "finalized"
    bill.updated_at = get_ist_now()

    # 3. Generate PDF
    pdf_filename = f"{bill.bill_number}.pdf"
    pdf_filepath = os.path.join(BILLS_DIR, pdf_filename)
    try:
        totals_payload = {
            "items": items,
            "subtotal": bill.subtotal,
            "discount": bill.discount,
            "taxable_amount": bill.subtotal - bill.discount,
            "tax_rate": bill.tax_rate,
            "total_tax": bill.cgst_amount + bill.sgst_amount + bill.igst_amount,
            "cgst": bill.cgst_amount,
            "sgst": bill.sgst_amount,
            "igst": bill.igst_amount,
            "delivery_charge": bill.delivery_charge,
            "final_total": bill.final_total,
            "amount_paid": bill.amount_paid,
            "balance_due": bill.balance_due,
            "payment_method": bill.payment_method
        }
        pdf_bytes = generate_invoice_pdf(
            bill_number=bill.bill_number,
            bill_type=bill.bill_type,
            issue_date=bill.issue_date,
            order_id="",
            vendor_data={
                "shop_name": current_vendor.shop_name,
                "name": current_vendor.name,
                "phone": current_vendor.phone,
                "address": current_vendor.address,
                "gstin": current_vendor.gstin
            },
            customer_data={
                "name": bill.customer_name,
                "phone": bill.customer_phone,
                "address": bill.customer_address
            },
            totals_data=totals_payload,
            payment_status=bill.payment_status,
            version=bill.version
        )
        with open(pdf_filepath, "wb") as f:
            f.write(pdf_bytes)
        bill.pdf_path = pdf_filepath
    except Exception as e:
        pass

    db.commit()
    db.refresh(bill)

    return {
        "success": True,
        "message": f"Bill #{bill.bill_number} finalized and stock updated.",
        "bill": format_bill_response(bill)
    }


@router.post("/vendor/bills/{id}/send")
def send_bill_notification(
    id: int,
    req: SendBillRequest,
    db: Session = Depends(get_db),
    current_vendor: Vendor = Depends(get_current_vendor)
):
    """
    Sends or retries sending bill notification to customer phone via WhatsApp or SMS.
    Does NOT duplicate bill or re-deduct stock.
    """
    bill = db.query(Bill).filter(
        Bill.id == id,
        Bill.vendor_phone == current_vendor.phone
    ).first()

    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found.")

    target_phone = clean_phone_number(req.recipient_phone or bill.customer_phone)
    if not target_phone:
        raise HTTPException(status_code=400, detail="Customer phone number is required to send notification.")

    bill.customer_phone = target_phone
    bill.delivery_channel = req.channel

    secure_pdf_link = f"/api/bills/{bill.id}/pdf?token={bill.access_token}"
    msg = (
        f"Hello {bill.customer_name},\n\n"
        f"Your bill #{bill.bill_number} from {current_vendor.shop_name or 'our store'} is ready.\n"
        f"Total Amount: ₹{bill.final_total:.2f}\n"
        f"Payment Status: {bill.payment_status.upper()}\n"
        f"Download Invoice PDF: {secure_pdf_link}\n\n"
        f"Thank you!"
    )

    delivery_res = send_whatsapp_or_sms_notification(
        recipient_phone=target_phone,
        message_text=msg,
        channel=req.channel
    )

    bill.delivery_status = delivery_res.get("status", "failed")
    if delivery_res.get("success"):
        bill.delivery_error = None
        if bill.status == "finalized":
            bill.status = "sent"
    else:
        bill.delivery_error = delivery_res.get("reason") or delivery_res.get("error")

    db.commit()
    db.refresh(bill)

    return {
        "success": delivery_res.get("success", False),
        "status": bill.delivery_status,
        "channel": req.channel,
        "message": "Bill sent successfully." if delivery_res.get("success") else f"Delivery {bill.delivery_status}: {bill.delivery_error}",
        "bill": format_bill_response(bill)
    }


@router.post("/vendor/bills/{id}/payment")
def record_bill_payment(
    id: int,
    req: RecordPaymentRequest,
    db: Session = Depends(get_db),
    current_vendor: Vendor = Depends(get_current_vendor)
):
    """Records payment for a bill, updating amount paid, balance due, and payment status."""
    bill = db.query(Bill).filter(
        Bill.id == id,
        Bill.vendor_phone == current_vendor.phone
    ).first()

    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found.")

    new_amount_paid = bill.amount_paid + req.amount
    bill.amount_paid = new_amount_paid
    bill.balance_due = max(0.0, bill.final_total - new_amount_paid)

    if bill.balance_due <= 0.0:
        bill.payment_status = "paid"
    else:
        bill.payment_status = "partially_paid"

    bill.payment_method = req.payment_method
    bill.updated_at = get_ist_now()

    db.commit()
    db.refresh(bill)

    return {
        "success": True,
        "message": f"Payment of ₹{req.amount:.2f} recorded. Status: {bill.payment_status.upper()}.",
        "bill": format_bill_response(bill)
    }


@router.post("/vendor/bills/{id}/cancel")
def cancel_bill(
    id: int,
    db: Session = Depends(get_db),
    current_vendor: Vendor = Depends(get_current_vendor)
):
    """
    Controlled cancellation/return process:
    If stock was previously deducted, restores stock atomically using compensating IN transactions.
    """
    bill = db.query(Bill).filter(
        Bill.id == id,
        Bill.vendor_phone == current_vendor.phone
    ).first()

    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found.")

    if bill.status == "cancelled":
        return {"success": True, "message": "Bill is already cancelled.", "bill": format_bill_response(bill)}

    # If stock was deducted, restore it
    if bill.stock_deducted:
        items = json.loads(bill.items_json)
        batch_id = str(uuid.uuid4())
        for it in items:
            if it.get("item_id"):
                db_item = db.query(Item).filter(Item.id == it["item_id"]).first()
                if db_item:
                    db_item.qty += it["qty"]
                    db_item.updated_at = get_ist_now()

            txn = Transaction(
                batch_id=batch_id,
                vendor=current_vendor.phone,
                item_name=it["product_name"],
                unit=it["unit"],
                change=+it["qty"],
                price=it["unit_price"],
                raw_text=f"Restored {it['qty']} {it['unit']} of {it['product_name']} from Cancelled Bill #{bill.bill_number}",
                created_at=get_ist_now(),
                undone=False
            )
            db.add(txn)

        bill.stock_deducted = False

    bill.status = "cancelled"
    bill.payment_status = "cancelled"
    bill.updated_at = get_ist_now()

    db.commit()
    db.refresh(bill)

    return {
        "success": True,
        "message": f"Bill #{bill.bill_number} cancelled and stock restored to inventory.",
        "bill": format_bill_response(bill)
    }


# --- 3. Secure PDF Access ---

@router.get("/bills/{id}/pdf")
def download_bill_pdf(
    id: int,
    token: Optional[str] = None,
    db: Session = Depends(get_db),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    """
    Secure PDF download.
    Accessible if:
    1. Query param 'token' matches bill.access_token (expiring / secure link).
    2. Authenticated vendor owns the bill.
    3. Authenticated customer matches bill.customer_phone.
    Never exposes PDF via public guessable URL without credentials or token.
    """
    bill = db.query(Bill).filter(Bill.id == id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found.")

    authorized = False

    # Check 1: Token match
    if token and bill.access_token and secrets.compare_digest(token, bill.access_token):
        authorized = True

    # Check 2: Authenticated user
    if not authorized and user:
        user_role = user.get("role")
        user_phone = clean_phone_number(user.get("phone"))
        bill_cust_phone = clean_phone_number(bill.customer_phone)

        if user_role in ["vendor", "admin"] and user_phone == clean_phone_number(bill.vendor_phone):
            authorized = True
        elif user_role == "customer" and bill_cust_phone and user_phone == bill_cust_phone:
            authorized = True

    if not authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Valid authorization token or customer login required."
        )

    if not bill.pdf_path or not os.path.exists(bill.pdf_path):
        # Regenerate on demand if file is missing
        try:
            items = json.loads(bill.items_json)
            vendor = db.query(Vendor).filter(Vendor.phone == bill.vendor_phone).first()
            totals_payload = {
                "items": items,
                "subtotal": bill.subtotal,
                "discount": bill.discount,
                "taxable_amount": bill.subtotal - bill.discount,
                "tax_rate": bill.tax_rate,
                "total_tax": bill.cgst_amount + bill.sgst_amount + bill.igst_amount,
                "cgst": bill.cgst_amount,
                "sgst": bill.sgst_amount,
                "igst": bill.igst_amount,
                "delivery_charge": bill.delivery_charge,
                "final_total": bill.final_total,
                "amount_paid": bill.amount_paid,
                "balance_due": bill.balance_due,
                "payment_method": bill.payment_method
            }
            pdf_bytes = generate_invoice_pdf(
                bill_number=bill.bill_number,
                bill_type=bill.bill_type,
                issue_date=bill.issue_date,
                order_id="",
                vendor_data={
                    "shop_name": vendor.shop_name if vendor else "",
                    "name": vendor.name if vendor else "",
                    "phone": vendor.phone if vendor else "",
                    "address": vendor.address if vendor else "",
                    "gstin": vendor.gstin if vendor else ""
                },
                customer_data={
                    "name": bill.customer_name,
                    "phone": bill.customer_phone,
                    "address": bill.customer_address
                },
                totals_data=totals_payload,
                payment_status=bill.payment_status,
                version=bill.version
            )
            pdf_filepath = os.path.join(BILLS_DIR, f"{bill.bill_number}.pdf")
            with open(pdf_filepath, "wb") as f:
                f.write(pdf_bytes)
            bill.pdf_path = pdf_filepath
            db.commit()
        except Exception as e:
            print("DOWNLOAD_BILL_PDF REGENERATION FAILED:", type(e), e)
            raise HTTPException(status_code=500, detail=f"Failed to render bill PDF: {type(e).__name__} - {e}")

    return FileResponse(
        bill.pdf_path,
        media_type="application/pdf",
        filename=f"{bill.bill_number}.pdf"
    )


# --- 4. Customer Bills & History ---

@router.get("/customer/bills")
def get_customer_bills(
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer)
):
    """
    Returns bills associated with the authenticated customer.
    Customer can see and download only their own bills.
    """
    clean_phone = clean_phone_number(current_customer.phone)

    bills = db.query(Bill).filter(
        or_(
            Bill.customer_phone == clean_phone,
            Bill.customer_phone == f"whatsapp:{clean_phone}",
            Bill.customer_phone == current_customer.phone
        ),
        Bill.status.in_(["finalized", "sent", "paid", "partially_paid"])
    ).order_by(desc(Bill.created_at)).all()

    results = []
    for b in bills:
        vendor = db.query(Vendor).filter(Vendor.phone == b.vendor_phone).first()
        results.append({
            "id": b.id,
            "bill_number": b.bill_number,
            "order_id": b.order_id,
            "bill_type": b.bill_type,
            "status": b.status,
            "issue_date": b.issue_date.isoformat() if b.issue_date else "",
            "created_at": b.created_at.isoformat() if b.created_at else "",
            "vendor_name": vendor.shop_name if vendor else "Local Store",
            "vendor_phone": b.vendor_phone,
            "vendor_address": getattr(vendor, "address", "") if vendor else "",
            "subtotal": b.subtotal,
            "discount": b.discount,
            "tax_rate": b.tax_rate,
            "final_total": b.final_total,
            "grand_total": b.final_total,
            "payment_status": b.payment_status,
            "payment_method": b.payment_method,
            "amount_paid": b.amount_paid,
            "balance_due": b.balance_due,
            "has_pdf": bool(b.pdf_path and os.path.exists(b.pdf_path)),
            "access_token": b.access_token,
            "items_count": len(json.loads(b.items_json)) if b.items_json else 0,
            "items": json.loads(b.items_json) if b.items_json else []
        })

    return {
        "success": True,
        "bills": results
    }


@router.get("/customer/bills/{id}")
def get_customer_bill_detail(
    id: int,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer)
):
    """Customer detailed bill inspection."""
    clean_phone = clean_phone_number(current_customer.phone)
    bill = db.query(Bill).filter(
        Bill.id == id,
        or_(
            Bill.customer_phone == clean_phone,
            Bill.customer_phone == f"whatsapp:{clean_phone}",
            Bill.customer_phone == current_customer.phone
        )
    ).first()

    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found or unauthorized.")

    vendor = db.query(Vendor).filter(Vendor.phone == bill.vendor_phone).first()
    return {
        "success": True,
        "bill": {
            **format_bill_response(bill),
            "vendor_name": vendor.shop_name if vendor else "Local Store",
            "vendor_address": vendor.address if vendor else ""
        }
    }


def format_bill_response(bill: Bill) -> Dict[str, Any]:
    items = []
    if bill.items_json:
        try:
            items = json.loads(bill.items_json)
        except Exception:
            items = []

    return {
        "id": bill.id,
        "bill_number": bill.bill_number,
        "order_id": bill.order_id,
        "vendor_phone": bill.vendor_phone,
        "customer_phone": bill.customer_phone,
        "customer_name": bill.customer_name,
        "customer_address": bill.customer_address,
        "bill_type": bill.bill_type,
        "status": bill.status,
        "version": bill.version,
        "issue_date": bill.issue_date.isoformat() if bill.issue_date else "",
        "subtotal": bill.subtotal,
        "discount": bill.discount,
        "tax_rate": bill.tax_rate,
        "cgst_amount": bill.cgst_amount,
        "sgst_amount": bill.sgst_amount,
        "igst_amount": bill.igst_amount,
        "delivery_charge": bill.delivery_charge,
        "final_total": bill.final_total,
        "payment_status": bill.payment_status,
        "payment_method": bill.payment_method,
        "amount_paid": bill.amount_paid,
        "balance_due": bill.balance_due,
        "delivery_channel": bill.delivery_channel,
        "delivery_status": bill.delivery_status,
        "delivery_error": bill.delivery_error,
        "stock_deducted": bill.stock_deducted,
        "access_token": bill.access_token,
        "vendor_gstin": bill.vendor_gstin,
        "notes": bill.notes,
        "has_pdf": bool(bill.pdf_path and os.path.exists(bill.pdf_path)),
        "items": items,
        "created_at": bill.created_at.isoformat() if bill.created_at else "",
        "updated_at": bill.updated_at.isoformat() if bill.updated_at else ""
    }
