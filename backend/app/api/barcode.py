import io
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.core.time_utils import get_ist_now
from app.core.auth_dependency import get_current_vendor
from app.models.vendor import Vendor
from app.models.item import Item
from app.models.transaction import Transaction
from app.services.barcode_service import decode_barcode_from_image

router = APIRouter(prefix="/api", tags=["Barcode & Inventory"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/bmp", "image/gif"}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/barcode/decode")
async def decode_barcode(
    file: UploadFile = File(...)
):
    """
    Decodes barcodes from an uploaded barcode image.
    Supports EAN-13, EAN-8, UPC-A, UPC-E, Code 128, QR Code, etc.
    """
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image type '{file.content_type}'. Please upload JPEG, PNG, or WEBP."
        )

    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds maximum allowed limit of 10MB."
        )

    barcodes = decode_barcode_from_image(content)
    if not barcodes:
        return {
            "success": False,
            "message": "No barcode detected in the image. Please try a clearer picture, crop closer, or enter manually.",
            "barcodes": []
        }

    return {
        "success": True,
        "message": f"Successfully detected {len(barcodes)} barcode(s).",
        "barcodes": barcodes,
        "primary_barcode": barcodes[0]["text"]
    }


@router.get("/vendor/inventory/barcode/{code}")
def search_product_by_barcode(
    code: str,
    db: Session = Depends(get_db),
    current_vendor: Vendor = Depends(get_current_vendor)
):
    """
    Searches vendor's active inventory by exact barcode or SKU.
    Strictly isolated to current vendor.
    """
    clean_code = code.strip()
    if not clean_code:
        raise HTTPException(status_code=400, detail="Barcode cannot be empty")

    item = db.query(Item).filter(
        Item.vendor == current_vendor.phone,
        or_(
            Item.barcode == clean_code,
            Item.sku == clean_code
        )
    ).first()

    if not item:
        # Also try case-insensitive or partial name match if alphanumeric
        return {
            "found": False,
            "barcode": clean_code,
            "message": f"No product with barcode or SKU '{clean_code}' found in your inventory."
        }

    return {
        "found": True,
        "item": {
            "id": item.id,
            "name": item.name,
            "unit": item.unit,
            "qty": item.qty,
            "price": item.price,
            "cost_price": item.cost_price,
            "tax_rate": item.tax_rate,
            "category": item.category,
            "barcode": item.barcode,
            "sku": item.sku,
            "threshold": item.threshold
        }
    }


@router.post("/vendor/inventory/quick-add")
def quick_add_inventory_product(
    name: str = Form(...),
    unit: str = Form("pcs"),
    price: float = Form(...),
    cost_price: Optional[float] = Form(None),
    tax_rate: float = Form(0.0),
    barcode: Optional[str] = Form(None),
    sku: Optional[str] = Form(None),
    category: Optional[str] = Form("General Store"),
    opening_stock: float = Form(0.0),
    threshold: float = Form(5.0),
    db: Session = Depends(get_db),
    current_vendor: Vendor = Depends(get_current_vendor)
):
    """
    Adds a new product to vendor inventory when a barcode scan does not match existing products.
    Creates an initial IN transaction for opening stock, ensuring inventory and analytics sync.
    Does NOT assign the product to any customer.
    Enforces no duplicate barcode for this vendor.
    """
    clean_name = name.strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="Product name is required.")

    clean_barcode = barcode.strip() if barcode else None
    clean_sku = sku.strip() if sku else None

    # Check for duplicate product name under this vendor
    existing_name = db.query(Item).filter(
        Item.vendor == current_vendor.phone,
        Item.name.ilike(clean_name)
    ).first()
    if existing_name:
        raise HTTPException(
            status_code=400,
            detail=f"Product with name '{clean_name}' already exists in your inventory."
        )

    # Check for duplicate barcode under this vendor
    if clean_barcode:
        existing_barcode = db.query(Item).filter(
            Item.vendor == current_vendor.phone,
            Item.barcode == clean_barcode
        ).first()
        if existing_barcode:
            raise HTTPException(
                status_code=400,
                detail=f"Barcode '{clean_barcode}' is already assigned to product '{existing_barcode.name}'."
            )

    new_item = Item(
        vendor=current_vendor.phone,
        name=clean_name,
        unit=unit,
        price=price,
        cost_price=cost_price,
        tax_rate=tax_rate,
        barcode=clean_barcode,
        sku=clean_sku,
        category=category or "General Store",
        qty=max(0.0, opening_stock),
        threshold=threshold,
        is_public=True,
        updated_at=get_ist_now()
    )
    db.add(new_item)
    db.flush()

    # If opening stock > 0, log transaction so analytics and audit trail record it
    if opening_stock > 0:
        batch_id = str(uuid.uuid4())
        txn = Transaction(
            batch_id=batch_id,
            vendor=current_vendor.phone,
            item_name=clean_name,
            unit=unit,
            change=opening_stock,
            price=price,
            raw_text=f"Opening stock for new product {clean_name} (Barcode: {clean_barcode or 'N/A'})",
            created_at=get_ist_now(),
            undone=False
        )
        db.add(txn)

    db.commit()
    db.refresh(new_item)

    return {
        "success": True,
        "message": f"Product '{new_item.name}' saved to inventory.",
        "item": {
            "id": new_item.id,
            "name": new_item.name,
            "unit": new_item.unit,
            "qty": new_item.qty,
            "price": new_item.price,
            "cost_price": new_item.cost_price,
            "tax_rate": new_item.tax_rate,
            "barcode": new_item.barcode,
            "sku": new_item.sku,
            "category": new_item.category
        }
    }
