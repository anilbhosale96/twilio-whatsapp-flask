import re
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, asc, func

from app.core.database import get_db
from app.models.item import Item
from app.models.vendor import Vendor
from app.core.formatters import format_inr
from app.services.chat_preview import mask_phone_number

router = APIRouter(prefix="/api/products", tags=["Customer Product Discovery"])

# Category keywords mapping for intelligent categorization of unclassified items
CATEGORY_KEYWORDS = {
    "Grocery": [
        "rice", "sugar", "oil", "salt", "atta", "wheat", "flour", "milk", "bread",
        "biscuit", "parle", "maggi", "tea", "chai", "coffee", "dal", "pulse",
        "butter", "ghee", "masala", "spice", "haldi", "mirch", "onion", "potato",
        "fortune", "tata", "amul", "aashirvaad"
    ],
    "Pharmacy": [
        "paracetamol", "cough", "syrup", "strip", "tablet", "capsule", "antiseptic",
        "dettol", "band-aid", "bandage", "crocin", "aspirin", "vitamin", "ointment",
        "cream", "balm", "vicks", "pain", "medical", "sanitizer"
    ],
    "Stationery": [
        "notebook", "book", "pen", "pencil", "eraser", "sharpener", "ruler", "scale",
        "glue", "fevicol", "stapler", "pin", "register", "marker", "highlighter",
        "paper", "sheet", "envelope", "file", "folder", "diary", "chart"
    ],
    "General Store": [
        "soap", "shampoo", "toothpaste", "colgate", "surf", "detergent", "powder",
        "broom", "bucket", "battery", "bulb", "brush", "tissue", "cleaner", "harpic",
        "lizol", "rin", "aerial", "tide", "vim", "bar"
    ]
}

# Curated product images per category / product
PRODUCT_IMAGES: Dict[str, str] = {
    "rice": "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=500&q=80",
    "sugar": "https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=500&q=80",
    "oil": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=500&q=80",
    "salt": "https://images.unsplash.com/photo-1518110903476-c22f0337c768?auto=format&fit=crop&w=500&q=80",
    "milk": "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=500&q=80",
    "bread": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80",
    "maggi": "https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=500&q=80",
    "paracetamol": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=500&q=80",
    "soap": "https://images.unsplash.com/photo-1607006314646-0b1a03975a5e?auto=format&fit=crop&w=500&q=80",
    "notebook": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=500&q=80",
    "pen": "https://images.unsplash.com/photo-1585336261026-778dd477b75f?auto=format&fit=crop&w=500&q=80",
    "shampoo": "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=500&q=80",
}

DEFAULT_CATEGORY_IMAGES = {
    "Grocery": "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80",
    "Pharmacy": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=500&q=80",
    "Stationery": "https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?auto=format&fit=crop&w=500&q=80",
    "General Store": "https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=500&q=80"
}

def resolve_item_category(item_name: str, item_category: Optional[str], vendor_category: Optional[str]) -> str:
    """Intelligently classifies product into Grocery, Pharmacy, Stationery, or General Store."""
    if item_category and item_category in CATEGORY_KEYWORDS:
        return item_category

    lower_name = item_name.lower()
    for cat, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in lower_name for kw in keywords):
            return cat

    if vendor_category and vendor_category in CATEGORY_KEYWORDS:
        return vendor_category

    return "Grocery"

def get_product_image(item_name: str, category: str, custom_img: Optional[str] = None) -> str:
    """Returns matching product image URL."""
    if custom_img:
        return custom_img

    lower_name = item_name.lower()
    for key, url in PRODUCT_IMAGES.items():
        if key in lower_name:
            return url

    return DEFAULT_CATEGORY_IMAGES.get(category, DEFAULT_CATEGORY_IMAGES["Grocery"])


@router.get("", response_model=Dict[str, Any])
def search_products(
    q: Optional[str] = Query(None, description="Search keyword matching product name, brand, or store"),
    category: Optional[str] = Query("All", description="Category filter (Grocery, Pharmacy, Stationery, General Store, or All)"),
    in_stock_only: bool = Query(False, description="Filter only items currently in stock"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price filter"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price filter"),
    sort: Optional[str] = Query("popular", description="Sort by: price_asc, price_desc, name_asc, name_desc, popular"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db)
):
    """
    Public discovery endpoint:
    Searches all products across all registered shops with real-time stock and prices.
    Excludes private or inactive listings.
    """
    # Base query joining Item with Vendor
    query = (
        db.query(Item, Vendor)
        .join(Vendor, Item.vendor == Vendor.phone)
    )

    # Exclude items marked private if is_public column exists
    if hasattr(Item, "is_public"):
        query = query.filter(Item.is_public == True)

    # 1. Search Query Filter (Keyword, partial product name, store name)
    if q and q.strip():
        sanitized_q = q.strip()[:100]
        term = f"%{sanitized_q}%"
        query = query.filter(
            or_(
                Item.name.ilike(term),
                Item.unit.ilike(term),
                Vendor.shop_name.ilike(term),
                Vendor.name.ilike(term)
            )
        )

    # 2. In Stock Only Filter
    if in_stock_only:
        query = query.filter(Item.qty > 0)

    # 3. Price Range Filter
    if min_price is not None:
        query = query.filter(Item.price >= min_price)
    if max_price is not None:
        query = query.filter(Item.price <= max_price)

    # Fetch intermediate results to handle heuristic categorization accurately
    all_results = query.all()

    # 4. In-memory category resolution & filter
    filtered_results = []
    category_filter = category.strip() if category else "All"

    for item, vendor in all_results:
        resolved_cat = resolve_item_category(
            item.name,
            getattr(item, "category", None),
            vendor.category
        )

        if category_filter != "All" and resolved_cat.lower() != category_filter.lower():
            continue

        filtered_results.append((item, vendor, resolved_cat))

    total_count = len(filtered_results)

    # 5. Sorting
    if sort == "price_asc":
        filtered_results.sort(key=lambda x: (x[0].price is None, x[0].price or 0.0))
    elif sort == "price_desc":
        filtered_results.sort(key=lambda x: (x[0].price or 0.0), reverse=True)
    elif sort == "name_asc":
        filtered_results.sort(key=lambda x: x[0].name.lower())
    elif sort == "name_desc":
        filtered_results.sort(key=lambda x: x[0].name.lower(), reverse=True)
    else:  # popular / stock
        filtered_results.sort(key=lambda x: x[0].qty, reverse=True)

    # 6. Pagination
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_results = filtered_results[start_idx:end_idx]

    # 7. Response formatting
    items_out = []
    for item, vendor, resolved_cat in paginated_results:
        stock_status = "in_stock"
        if item.qty <= 0:
            stock_status = "out_of_stock"
        elif item.qty <= item.threshold:
            stock_status = "low_stock"

        img = get_product_image(
            item.name,
            resolved_cat,
            getattr(item, "image_url", None)
        )

        items_out.append({
            "id": item.id,
            "name": item.name,
            "unit": item.unit,
            "qty": float(item.qty),
            "threshold": float(item.threshold),
            "price": float(item.price) if item.price is not None else None,
            "price_formatted": format_inr(item.price) if item.price is not None else "Price on Request",
            "stock_status": stock_status,
            "is_in_stock": item.qty > 0,
            "category": resolved_cat,
            "image_url": img,
            "store": {
                "name": vendor.shop_name or vendor.name,
                "owner": vendor.name,
                "category": vendor.category or "Grocery",
                "phone_masked": mask_phone_number(vendor.phone),
                "location": "Pune, MH"
            },
            "updated_at": item.updated_at.isoformat() if item.updated_at else None
        })

    return {
        "success": True,
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": (total_count + limit - 1) // limit if total_count > 0 else 1,
        "products": items_out
    }


@router.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    """Returns available categories with product counts."""
    items = db.query(Item, Vendor).join(Vendor, Item.vendor == Vendor.phone).all()
    counts = {
        "Grocery": 0,
        "Pharmacy": 0,
        "Stationery": 0,
        "General Store": 0
    }

    for item, vendor in items:
        cat = resolve_item_category(item.name, getattr(item, "category", None), vendor.category)
        if cat in counts:
            counts[cat] += 1
        else:
            counts["General Store"] += 1

    return {
        "success": True,
        "categories": [
            {"id": "All", "name": "All Categories", "count": len(items)},
            {"id": "Grocery", "name": "Grocery", "count": counts["Grocery"]},
            {"id": "Pharmacy", "name": "Pharmacy", "count": counts["Pharmacy"]},
            {"id": "Stationery", "name": "Stationery", "count": counts["Stationery"]},
            {"id": "General Store", "name": "General Store", "count": counts["General Store"]},
        ]
    }


@router.get("/{product_id}")
def get_product_details(product_id: int, db: Session = Depends(get_db)):
    """Returns single product details with store information."""
    res = (
        db.query(Item, Vendor)
        .join(Vendor, Item.vendor == Vendor.phone)
        .filter(Item.id == product_id)
        .first()
    )
    if not res:
        raise HTTPException(status_code=404, detail="Product not found.")

    item, vendor = res
    cat = resolve_item_category(item.name, getattr(item, "category", None), vendor.category)
    img = get_product_image(item.name, cat, getattr(item, "image_url", None))

    return {
        "success": True,
        "product": {
            "id": item.id,
            "name": item.name,
            "unit": item.unit,
            "qty": float(item.qty),
            "price": float(item.price) if item.price is not None else None,
            "price_formatted": format_inr(item.price) if item.price is not None else "Price on Request",
            "stock_status": "in_stock" if item.qty > 0 else "out_of_stock",
            "is_in_stock": item.qty > 0,
            "category": cat,
            "image_url": img,
            "store": {
                "name": vendor.shop_name or vendor.name,
                "owner": vendor.name,
                "category": vendor.category or "Grocery",
                "phone_masked": mask_phone_number(vendor.phone),
                "location": "Pune, MH"
            }
        }
    }

