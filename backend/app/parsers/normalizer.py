import re
from typing import Optional

UNIT_MAP = {
    # Kilograms
    "kg": "kg",
    "kgs": "kg",
    "kilo": "kg",
    "kilos": "kg",
    "kilogram": "kg",
    "kilograms": "kg",
    # Grams
    "g": "g",
    "gm": "g",
    "gms": "g",
    "gram": "g",
    "grams": "g",
    # Liters
    "l": "l",
    "lt": "l",
    "ltr": "l",
    "ltrs": "l",
    "liter": "l",
    "litre": "l",
    "liters": "l",
    "litres": "l",
    # Milliliters
    "ml": "ml",
    "mls": "ml",
    "milliliter": "ml",
    "millilitre": "ml",
    # Pieces
    "pcs": "pcs",
    "pc": "pcs",
    "piece": "pcs",
    "pieces": "pcs",
    "nag": "pcs",
    "nang": "pcs",
    "no": "pcs",
    "nos": "pcs",
    # Packets
    "packet": "packet",
    "packets": "packet",
    "pkt": "packet",
    "pkts": "packet",
    "pack": "packet",
    "packs": "packet",
    "puda": "packet",
    "pude": "packet",
    # Dozen
    "dozen": "dozen",
    "dozens": "dozen",
    "darjan": "dozen",
    "dzn": "dozen",
    # Boxes
    "box": "box",
    "boxes": "box",
    "dabba": "box",
    "dappe": "box",
    "dabbae": "box",
    "peti": "box"
}

ITEM_SYNONYMS = {
    "chawal": "rice",
    "chaawal": "rice",
    "tandul": "rice",
    "tel": "oil",
    "tail": "oil",
    "cheeni": "sugar",
    "chini": "sugar",
    "shakkar": "sugar",
    "sakhar": "sugar",
    "doodh": "milk",
    "dudh": "milk",
    "atta": "atta",
    "aata": "atta",
    "pith": "atta",
    "ande": "egg",
    "anda": "egg",
    "eggs": "egg",
    "breads": "bread",
    "chai": "tea",
    "chaha": "tea",
    "sabun": "soap",
    "biscuits": "biscuit",
    "biskoot": "biscuit",
    "biskut": "biscuit",
    "chips": "chips",
    "dal": "dal",
    "daal": "dal",
    "toor dal": "toor dal",
    "masoor dal": "masoor dal",
    "moong dal": "moong dal",
    "ghee": "ghee",
    "paneer": "paneer",
    "butter": "butter",
    "makkhan": "butter",
    "loni": "butter",
    "maggi": "maggi",
    "noodles": "noodles",
    "onion": "onion",
    "onions": "onion",
    "pyaz": "onion",
    "kanda": "onion",
    "potato": "potato",
    "potatoes": "potato",
    "aloo": "potato",
    "batata": "potato",
    "tomato": "tomato",
    "tomatoes": "tomato",
    "tamatar": "tomato",
    "parleg": "parle g",
    "parle-g": "parle g",
    "parle g": "parle g"
}

STRIP_WORDS = {
    "aaya", "aaye", "aayi", "aya", "aye", "ayi", "laaya", "laya", "laaye", "laye", "kharida", "khareeda",
    "kharide", "buy", "bought", "purchase", "purchased", "mila", "mili", "mile",
    "aala", "aale", "aali", "anle", "aanle", "ghetla", "ghetle", "ghetli", "bharle",
    "restock", "add", "added", "adds", "becha", "beche", "bechi", "bik", "diya", "diye",
    "dila", "dile", "vikla", "vikle", "vikli", "gela", "gele", "geli", "sell", "sold",
    "sells", "bhai", "bhaiya", "ji", "sir", "hai", "hain", "tha", "thi", "the", "ho",
    "gaya", "gaye", "gayi", "karo", "kara", "liya", "liye", "aur", "and"
}

def normalize_unit(raw_unit: Optional[str]) -> str:
    if not raw_unit:
        return "pcs"
    cleaned = raw_unit.strip().lower().rstrip(".,")
    return UNIT_MAP.get(cleaned, "pcs")

def normalize_item_name(raw_name: str) -> str:
    cleaned = raw_name.strip().lower()
    # Strip non-alphanumeric except spaces and dashes
    cleaned = re.sub(r"[^\w\s-]", "", cleaned).strip()

    # Strip leading and trailing action/filler words iteratively
    words = cleaned.split()
    changed = True
    while changed and words:
        changed = False
        if words and words[0] in STRIP_WORDS:
            words.pop(0)
            changed = True
        if words and words[-1] in STRIP_WORDS:
            words.pop(-1)
            changed = True

    cleaned = " ".join(words).strip()
    if not cleaned:
        return ""
    
    # Check dictionary
    if cleaned in ITEM_SYNONYMS:
        return ITEM_SYNONYMS[cleaned]
    
    # Simple singularization if ends with s and length > 3
    if cleaned.endswith("s") and not cleaned.endswith("ss") and len(cleaned) > 3:
        stem = cleaned[:-1]
        if stem in ITEM_SYNONYMS:
            return ITEM_SYNONYMS[stem]
        return stem

    return cleaned


