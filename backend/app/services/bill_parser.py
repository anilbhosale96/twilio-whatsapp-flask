import re
from typing import List, Dict, Any, Optional, Tuple

COMMON_IGNORE_PATTERNS = [
    r'^(?:purchase\s+invoice|sales\s+invoice|tax\s+invoice|retail\s+invoice|bill\s+of\s+supply|cash\s+memo|estimate|quotation|purchase\s+order)',
    r'^(?:supplier|vendor|distributor|dealer|customer|client|buyer):?',
    r'^(?:gstin|gst\s+no|cin|pan|fssai|phone|mob|tel|email|website|date|invoice\s+no|bill\s+no|order\s+no)',
    r'^(?:subtotal|sub\s+total|total|grand\s+total|cgst|sgst|igst|discount|round\s+off|net\s+amount|cash|card|upi|balance)',
    r'^(?:thank\s+you|visit\s+again|terms|conditions|authorized\s+signatory|customer\s+signature|e\s*&\s*o\s*e)',
    r'^(?:sr(?:\.?\s*no)?|item|description|product|particulars|qty|quantity|rate|price|unit|amount|mrp|disc|gst%|hsn)$',
    r'^[=\-_*#]{3,}$',
]

UNIT_ALIASES: Dict[str, str] = {
    'kg': 'kg',
    'kgs': 'kg',
    'kilo': 'kg',
    'kilos': 'kg',
    'kilogram': 'kg',
    'kilograms': 'kg',
    'gm': 'g',
    'gms': 'g',
    'gram': 'g',
    'grams': 'g',
    'g': 'g',
    'l': 'l',
    'lt': 'l',
    'ltr': 'l',
    'ltrs': 'l',
    'liter': 'l',
    'liters': 'l',
    'litre': 'l',
    'litres': 'l',
    'ml': 'ml',
    'mls': 'ml',
    'pkt': 'packets',
    'pkts': 'packets',
    'packet': 'packets',
    'packets': 'packets',
    'pcs': 'pcs',
    'pc': 'pcs',
    'piece': 'pcs',
    'pieces': 'pcs',
    'unit': 'pcs',
    'units': 'pcs',
    'box': 'box',
    'boxes': 'box',
    'bag': 'bag',
    'bags': 'bag',
    'sack': 'bag',
    'sacks': 'bag',
    'bale': 'bale',
    'tin': 'tin',
    'tins': 'tin',
    'jar': 'jar',
    'jars': 'jar',
    'bottle': 'bottle',
    'bottles': 'bottle',
    'carton': 'box',
    'cartons': 'box',
    'case': 'box',
    'cases': 'box',
    'dozen': 'dozen',
    'doz': 'dozen',
    'darjan': 'dozen',
}

def clean_item_name(name: str) -> str:
    """Cleans serial numbers, product codes, or unwanted characters from item names."""
    # Strip leading serial number e.g. "1.", "01)", "1 - "
    name = re.sub(r'^\s*\d+[\.\)\-\:]\s*', '', name)
    # Strip HSN / barcode codes e.g. "(HSN: 1905)" or "[3402]"
    name = re.sub(r'[\(\[]\s*(?:hsn|code|sku)?:?\s*\d+\s*[\)\]]', '', name, flags=re.IGNORECASE)
    # Clean up double spaces and punctuation
    name = re.sub(r'[\r\n\t]+', ' ', name)
    name = re.sub(r'\s{2,}', ' ', name)
    return name.strip()

def detect_bill_type(text: str) -> str:
    """
    Detects whether the bill is 'received' (purchase from supplier/vendor)
    or 'sold' (sales receipt to customer).
    """
    lower = text.lower()
    
    received_score = 0
    sold_score = 0
    
    received_keywords = [
        'purchase invoice', 'supplier', 'vendor', 'distributor', 'wholesaler',
        'received', 'goods received', 'inward', 'challan', 'delivery challan',
        'stock inward', 'bill from', 'consignment', 'stock in', 'purchased'
    ]
    sold_keywords = [
        'tax invoice', 'retail invoice', 'cash memo', 'sold to', 'customer',
        'bill to', 'sales bill', 'retail bill', 'counter sale', 'client',
        'sales invoice', 'stock outward', 'sale receipt', 'sold'
    ]
    
    for kw in received_keywords:
        if kw in lower:
            received_score += 2
            
    for kw in sold_keywords:
        if kw in lower:
            sold_score += 1
            
    if received_score > sold_score:
        return 'received'
    if sold_score > received_score:
        return 'sold'
    return 'received'  # Default for shop inventory stock-up bills

def parse_bill_line(
    line: str,
    default_action: str = 'ADD',
    allow_unquantified: bool = False
) -> Optional[Dict[str, Any]]:
    """
    Parses a single line of text from a bill, invoice, or customer shopping list.
    Attempts to extract: item_name, quantity, unit, price, and total.
    """
    cleaned_line = line.strip()
    if not cleaned_line or len(cleaned_line) < 2:
        return None

    # Check ignore patterns
    for pattern in COMMON_IGNORE_PATTERNS:
        if re.search(pattern, cleaned_line, re.IGNORECASE):
            return None

    # Normalization of attached numbers / units e.g. 1kgsugar -> 1 kg sugar, 10eggs -> 10 eggs
    norm_line = re.sub(
        r'^(\d+(?:\.\d+)?)\s*(kilograms?|kilos?|kg|grams?|gms?|gm|liters?|litres?|ltrs?|ltr|lt|packets?|pkts?|pkt|pieces?|pcs?|pc|boxes?|box|bags?|bag|dozen|ml)(?=[a-zA-Z])',
        r'\1 \2 ',
        cleaned_line,
        flags=re.IGNORECASE
    )
    norm_line = re.sub(r'^(\d+(?:\.\d+)?)(?=[a-zA-Z])', r'\1 ', norm_line)

    # Pattern A: Tab or multiple spaces separated tabular line
    # e.g.: "Tata Salt 1kg       10 pkts    28.00    280.00"
    # or:   "Parle G             25 pcs     10       250"
    cols = [c.strip() for c in re.split(r'\t+|\s{2,}', norm_line) if c.strip()]
    
    if len(cols) >= 3:
        name_candidate = cols[0]
        qty = None
        unit = 'pcs'
        price = None
        
        qty_match = re.search(r'(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?', cols[1])
        if qty_match:
            try:
                qty = float(qty_match.group(1))
                if qty_match.group(2):
                    u = qty_match.group(2).lower()
                    unit = UNIT_ALIASES.get(u, u)
            except ValueError:
                pass
                
        for c in cols[2:]:
            num_clean = re.sub(r'[^\d\.]', '', c)
            if num_clean:
                try:
                    val = float(num_clean)
                    if price is None:
                        price = val
                except ValueError:
                    pass

        if qty and qty > 0 and len(name_candidate) > 1:
            clean_name = clean_item_name(name_candidate)
            if clean_name and not any(re.search(p, clean_name, re.IGNORECASE) for p in COMMON_IGNORE_PATTERNS):
                return {
                    "name": clean_name,
                    "qty": qty,
                    "unit": unit,
                    "price": price,
                    "action": default_action
                }

    # Pattern B: Flexible regex for inline formats:
    # "10 kg Sugar @ 45" or "Tata Salt 10 pkt 28" or "15 Maggi noodles @ 14" or "2 parle G"
    # Regex 1: Quantity at the beginning
    match_leading_qty = re.search(
        r'^\s*(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\s+(?:of\s+)?([a-zA-Z0-9\s\.\-]+?)(?:\s*[@=]\s*(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?))?(?:\s*(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?))?\s*$',
        norm_line,
        re.IGNORECASE
    )
    if match_leading_qty:
        try:
            qty = float(match_leading_qty.group(1))
            raw_unit = (match_leading_qty.group(2) or '').lower()
            name_part = match_leading_qty.group(3)
            
            if raw_unit in UNIT_ALIASES:
                unit = UNIT_ALIASES[raw_unit]
                name = clean_item_name(name_part)
            else:
                unit = 'pcs'
                name = clean_item_name(f"{raw_unit} {name_part}" if raw_unit else name_part)

            price_val = match_leading_qty.group(4) or match_leading_qty.group(5)
            price = float(price_val) if price_val else None
            
            if qty > 0 and len(name) >= 1 and not any(re.search(p, name, re.IGNORECASE) for p in COMMON_IGNORE_PATTERNS):
                return {
                    "name": name,
                    "qty": qty,
                    "unit": unit,
                    "price": price,
                    "action": default_action
                }
        except Exception:
            pass

    # Regex 2: Item name first, then quantity:
    # "Tata Salt 10 packets 28" or "Fortune Oil 5L @ 140 = 700" or "Sugar 1kg"
    match_trailing_qty = re.search(
        r'^([a-zA-Z0-9\s\.\-]+?)\s+(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?(?:\s*[@=]\s*(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?))?(?:\s*(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?))?$',
        norm_line,
        re.IGNORECASE
    )
    if match_trailing_qty:
        try:
            name = clean_item_name(match_trailing_qty.group(1))
            qty = float(match_trailing_qty.group(2))
            raw_unit = (match_trailing_qty.group(3) or '').lower()
            unit = UNIT_ALIASES.get(raw_unit, 'pcs' if not raw_unit else raw_unit)
            price_val = match_trailing_qty.group(4) or match_trailing_qty.group(5)
            price = float(price_val) if price_val else None

            if qty > 0 and len(name) >= 1 and not any(re.search(p, name, re.IGNORECASE) for p in COMMON_IGNORE_PATTERNS):
                return {
                    "name": name,
                    "qty": qty,
                    "unit": unit,
                    "price": price,
                    "action": default_action
                }
        except Exception:
            pass

    # Fallback 3: Single item name with no quantity specified (e.g. "zvzvz", "milk", "bread")
    if allow_unquantified:
        name_only = clean_item_name(norm_line)
        if len(name_only) >= 2 and re.search(r'[a-zA-Z]', name_only) and not any(re.search(p, name_only, re.IGNORECASE) for p in COMMON_IGNORE_PATTERNS):
            return {
                "name": name_only,
                "qty": 1.0,
                "unit": "pcs",
                "price": None,
                "action": default_action
            }

    return None

def parse_full_bill_text(
    text: str,
    override_type: Optional[str] = None,
    allow_unquantified: bool = False
) -> Dict[str, Any]:
    """
    Parses full raw bill/invoice text, extracts all line items,
    computes totals and detects invoice type.
    """
    detected_type = override_type or detect_bill_type(text)
    action = 'ADD' if detected_type == 'received' else 'SELL'
    
    # Split by newlines or comma/semicolon if separated list
    raw_lines = re.split(r'[\r\n]+|(?<!\d),(?!\d)|;', text)
    lines = [l.strip() for l in raw_lines if l.strip()]
    parsed_items: List[Dict[str, Any]] = []
    seen_names = set()

    for line in lines:
        parsed = parse_bill_line(line, default_action=action, allow_unquantified=allow_unquantified)
        if parsed:
            # Consolidate if identical product appears multiple times in invoice
            normalized_key = parsed["name"].lower()
            if normalized_key in seen_names:
                for existing in parsed_items:
                    if existing["name"].lower() == normalized_key and existing["unit"] == parsed["unit"]:
                        existing["qty"] += parsed["qty"]
                        break
            else:
                seen_names.add(normalized_key)
                parsed_items.append(parsed)

    total_amount = sum(
        (item["qty"] * (item["price"] or 0.0)) for item in parsed_items if item.get("price") is not None
    )

    return {
        "bill_type": detected_type,
        "action": action,
        "items": parsed_items,
        "total_items": len(parsed_items),
        "total_amount": round(total_amount, 2),
        "raw_lines_count": len(lines)
    }

