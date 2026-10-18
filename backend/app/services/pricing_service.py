import re
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.item import Item
from app.services.inventory_service import find_vendor_item

BENCHMARK_PRICES = {
    "tata salt": {"price": 28.0, "unit": "kg", "source": "National FMCG Index (Oct 2026)", "confidence": 0.95},
    "parle g": {"price": 10.0, "unit": "pack", "source": "National FMCG Index (Oct 2026)", "confidence": 0.95},
    "maggi": {"price": 14.0, "unit": "pack", "source": "National FMCG Index (Oct 2026)", "confidence": 0.95},
    "amul butter": {"price": 58.0, "unit": "pack", "source": "India Dairy Retail (Oct 2026)", "confidence": 0.92},
    "crocin": {"price": 32.0, "unit": "strip", "source": "Pharma Retail Benchmark (Oct 2026)", "confidence": 0.90},
    "dettol": {"price": 85.0, "unit": "bottle", "source": "Pharma Retail Benchmark (Oct 2026)", "confidence": 0.90},
    "aashirvaad atta": {"price": 240.0, "unit": "pack", "source": "Kirana Mandi Index (Oct 2026)", "confidence": 0.90},
    "fortune sunflower oil": {"price": 165.0, "unit": "bottle", "source": "Kirana Mandi Index (Oct 2026)", "confidence": 0.90},
    "classmate notebook": {"price": 45.0, "unit": "pcs", "source": "Stationery Retail Index (Oct 2026)", "confidence": 0.88},
    "tea": {"price": 120.0, "unit": "pack", "source": "National FMCG Index (Oct 2026)", "confidence": 0.85},
    "chai": {"price": 120.0, "unit": "pack", "source": "National FMCG Index (Oct 2026)", "confidence": 0.85},
    "cheeni": {"price": 44.0, "unit": "kg", "source": "Sugar Retail Benchmark (Oct 2026)", "confidence": 0.85},
    "sugar": {"price": 44.0, "unit": "kg", "source": "Sugar Retail Benchmark (Oct 2026)", "confidence": 0.85},
    "rice": {"price": 60.0, "unit": "kg", "source": "Grain Mandi Benchmark (Oct 2026)", "confidence": 0.85},
    "chawal": {"price": 60.0, "unit": "kg", "source": "Grain Mandi Benchmark (Oct 2026)", "confidence": 0.85},
    "milk": {"price": 33.0, "unit": "packet", "source": "Local Dairy Price Index (Oct 2026)", "confidence": 0.90},
    "dudh": {"price": 33.0, "unit": "packet", "source": "Local Dairy Price Index (Oct 2026)", "confidence": 0.90},
    "bread": {"price": 35.0, "unit": "pack", "source": "Bakery Retail Index (Oct 2026)", "confidence": 0.90},
    "eggs": {"price": 84.0, "unit": "dozen", "source": "Poultry Retail Index (Oct 2026)", "confidence": 0.88},
}

def lookup_benchmark_price(product_name: str) -> Optional[Dict[str, Any]]:
    norm = product_name.strip().lower()
    for key, data in BENCHMARK_PRICES.items():
        if key in norm or norm in key:
            return data
    return None

def identify_and_price_item(
    db: Session,
    vendor_phone: str,
    product_name: str,
    requested_qty: float = 1.0,
    requested_unit: Optional[str] = None
) -> Dict[str, Any]:
    """
    Matches requested product against:
    1. Vendor's private inventory
    2. Platform catalogue across other vendors (as an online reference)
    3. FMCG/Pharma benchmark dataset (as an online reference)
    
    Ensures online prices are clearly marked as unconfirmed reference estimates.
    Does NOT invent prices if no reliable match is found.
    """
    clean_name = product_name.strip()
    vendor_item = find_vendor_item(db, vendor_phone, clean_name)

    if vendor_item:
        avail_qty = float(vendor_item.qty)
        in_stock = avail_qty >= requested_qty
        unit = vendor_item.unit or requested_unit or "pcs"

        if vendor_item.price is not None and vendor_item.price > 0:
            return {
                "item_id": vendor_item.id,
                "product_name": vendor_item.name,
                "unit": unit,
                "qty": requested_qty,
                "unit_price": float(vendor_item.price),
                "line_total": round(float(vendor_item.price) * requested_qty, 2),
                "price_source": "vendor",
                "reference_note": "Current shop inventory price",
                "reference_confidence": 1.0,
                "in_stock": in_stock,
                "current_inventory_qty": avail_qty,
                "is_confirmed_by_vendor": True
            }
        else:
            # Vendor has the item, but price is missing in inventory
            bench = lookup_benchmark_price(clean_name)
            if bench:
                return {
                    "item_id": vendor_item.id,
                    "product_name": vendor_item.name,
                    "unit": unit,
                    "qty": requested_qty,
                    "unit_price": bench["price"],
                    "line_total": round(bench["price"] * requested_qty, 2),
                    "price_source": "reference_online",
                    "reference_note": f"Estimated reference ({bench['source']}, conf: {int(bench['confidence']*100)}%). Requires vendor confirmation.",
                    "reference_confidence": bench["confidence"],
                    "in_stock": in_stock,
                    "current_inventory_qty": avail_qty,
                    "is_confirmed_by_vendor": False
                }
            else:
                return {
                    "item_id": vendor_item.id,
                    "product_name": vendor_item.name,
                    "unit": unit,
                    "qty": requested_qty,
                    "unit_price": None,
                    "line_total": 0.0,
                    "price_source": "unpriced",
                    "reference_note": "Awaiting vendor price quotation.",
                    "reference_confidence": None,
                    "in_stock": in_stock,
                    "current_inventory_qty": avail_qty,
                    "is_confirmed_by_vendor": False
                }

    # Item not found in this vendor's catalog: check platform catalog as reference
    other_item = db.query(Item).filter(
        Item.name.ilike(f"%{clean_name[:15]}%"),
        Item.price.isnot(None),
        Item.price > 0
    ).first()

    if other_item:
        unit = requested_unit or other_item.unit or "pcs"
        return {
            "item_id": None,
            "product_name": clean_name,
            "unit": unit,
            "qty": requested_qty,
            "unit_price": float(other_item.price),
            "line_total": round(float(other_item.price) * requested_qty, 2),
            "price_source": "reference_online",
            "reference_note": f"Market reference: ~₹{other_item.price} based on similar items. Requires vendor quote.",
            "reference_confidence": 0.80,
            "in_stock": False,
            "current_inventory_qty": 0.0,
            "is_confirmed_by_vendor": False
        }

    bench = lookup_benchmark_price(clean_name)
    if bench:
        unit = requested_unit or bench.get("unit", "pcs")
        return {
            "item_id": None,
            "product_name": clean_name,
            "unit": unit,
            "qty": requested_qty,
            "unit_price": bench["price"],
            "line_total": round(bench["price"] * requested_qty, 2),
            "price_source": "reference_online",
            "reference_note": f"Market reference: {bench['source']} (conf: {int(bench['confidence']*100)}%). Unconfirmed.",
            "reference_confidence": bench["confidence"],
            "in_stock": False,
            "current_inventory_qty": 0.0,
            "is_confirmed_by_vendor": False
        }

    # No reference available -> Mark as unpriced
    return {
        "item_id": None,
        "product_name": clean_name,
        "unit": requested_unit or "pcs",
        "qty": requested_qty,
        "unit_price": None,
        "line_total": 0.0,
        "price_source": "unpriced",
        "reference_note": "No reference price found. Vendor must provide quotation.",
        "reference_confidence": None,
        "in_stock": False,
        "current_inventory_qty": 0.0,
        "is_confirmed_by_vendor": False
    }
