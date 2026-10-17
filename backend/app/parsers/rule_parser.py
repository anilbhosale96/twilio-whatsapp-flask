import re
from typing import List, Optional, Tuple
from app.parsers.schemas import ParseResult, ParsedAction, ParsedCommand, ActionType
from app.parsers.normalizer import normalize_unit, normalize_item_name, UNIT_MAP

# Word number mappings (English, Hindi, Marathi)
WORD_NUMBERS = {
    "zero": 0, "shunya": 0,
    "one": 1, "ek": 1,
    "two": 2, "do": 2, "don": 2,
    "three": 3, "teen": 3,
    "four": 4, "char": 4,
    "five": 5, "paanch": 5, "pach": 5,
    "six": 6, "chhah": 6, "che": 6, "saha": 6,
    "seven": 7, "saat": 7,
    "eight": 8, "aath": 8,
    "nine": 9, "nau": 9,
    "ten": 10, "das": 10, "daha": 10,
    "half": 0.5, "aadha": 0.5, "ardha": 0.5,
    "quarter": 0.25, "paav": 0.25
}

ADD_KEYWORDS = {
    "add", "added", "adds", "addek", "ade", "aaya", "aaye", "aayi", "laaya", "laya",
    "laaye", "laye", "kharida", "khareeda", "kharide", "buy", "bought", "purchase",
    "purchased", "mila", "mili", "mile", "aala", "aale", "aali", "anle", "aanle",
    "ghetla", "ghetle", "ghetli", "bharle", "restock", "stock in", "+"
}

SELL_KEYWORDS = {
    "sell", "sold", "sells", "slood", "solld", "becha", "beche", "bechi", "bik",
    "bik gaya", "bik gaye", "diya", "diye", "diyo", "dila", "dile", "vikla", "vikle",
    "vikli", "gela", "gele", "geli", "kadhla", "kaata", "minus", "-", "sale"
}

def parse_command(text: str) -> Optional[ParsedCommand]:
    cleaned = text.strip().lower()
    
    # Start / Greeting / Onboarding commands
    if cleaned in {"hi", "hello", "start", "register", "join", "namaste", "namaskar", "shuru"}:
        return ParsedCommand(command="start")

    # Help commands
    if cleaned in {"help", "madad", "sahayata", "?"}:
        return ParsedCommand(command="help")

    # Language setting: lang <language> or bhasha <language>
    lang_match = re.match(r"^(?:lang|language|bhasha)\s+([a-zA-Z]+)$", cleaned)
    if lang_match:
        lang_arg = lang_match.group(1).strip()
        return ParsedCommand(command="lang", args=[lang_arg])

    # Shop name setting: shop <shop name>
    shop_match = re.match(r"^(?:shop|dukan|dookan)\s+(.+)$", cleaned)
    if shop_match:
        shop_arg = shop_match.group(1).strip()
        return ParsedCommand(command="shop", args=[shop_arg])

    # Owner name setting: name <owner name>
    name_match = re.match(r"^(?:name|malik|owner)\s+(.+)$", cleaned)
    if name_match:
        name_arg = name_match.group(1).strip()
        return ParsedCommand(command="name", args=[name_arg])
    
    # Stock commands
    if cleaned in {"stock", "inventory", "maal", "check stock", "stock list"}:
        return ParsedCommand(command="stock")
    
    # Low stock commands
    if cleaned in {"low", "low stock", "kam", "kami", "alert list"}:
        return ParsedCommand(command="low")
    
    # Report commands
    if cleaned in {"report", "daily report", "hisab", "hisob", "khata", "aaj ka hisab", "today report"}:
        return ParsedCommand(command="report")
    
    # Undo commands
    if cleaned in {"undo", "cancel", "wapas", "chuk", "revert"}:
        return ParsedCommand(command="undo")
    
    # Alert setting: alert <item> <number>
    alert_match = re.match(r"^alert\s+([a-zA-Z\s]+?)\s+(?:to\s+)?(\d+(?:\.\d+)?)$", cleaned)
    if alert_match:
        item_part = alert_match.group(1).strip()
        thresh_part = alert_match.group(2).strip()
        norm_item = normalize_item_name(item_part)
        return ParsedCommand(command="alert", args=[norm_item, thresh_part])
    
    return None

def extract_price(text: str) -> Tuple[Optional[float], str]:
    """Extract price (e.g., @20, @ 25.5, at 20, 20 rs) and return (price, remaining_text)"""
    # Pattern 1: @ 20 or @20
    m = re.search(r"@\s*(\d+(?:\.\d+)?)", text)
    if m:
        price = float(m.group(1))
        remaining = text[:m.start()] + " " + text[m.end():]
        return price, remaining.strip()
    
    # Pattern 2: at 20 or rs 20 or inr 20 or 20 rs
    m = re.search(r"(?:at|rs\.?|inr|rupees?|rupaye?|rupye?)\s*(\d+(?:\.\d+)?)", text, re.IGNORECASE)
    if m:
        price = float(m.group(1))
        remaining = text[:m.start()] + " " + text[m.end():]
        return price, remaining.strip()

    m = re.search(r"(\d+(?:\.\d+)?)\s*(?:rs|rupaye|rupye)", text, re.IGNORECASE)
    if m:
        price = float(m.group(1))
        remaining = text[:m.start()] + " " + text[m.end():]
        return price, remaining.strip()

    return None, text

def determine_action(text: str, default_action: Optional[ActionType] = None) -> Tuple[ActionType, str]:
    tokens = text.lower().split()
    action = default_action or "ADD"
    cleaned_tokens = []
    
    # Strip leading/trailing punctuation from tokens for keyword matching
    clean_words = [re.sub(r"^[^\w]+|[^\w]+$", "", tok) for tok in tokens]

    # Look for sell keywords
    has_sell = any(tok in SELL_KEYWORDS for tok in clean_words) or "bik gaya" in text.lower() or "bik gaye" in text.lower()
    has_add = any(tok in ADD_KEYWORDS for tok in clean_words)

    if has_sell and not has_add:
        action = "SELL"
    elif has_add and not has_sell:
        action = "ADD"

    # Remove the action keywords and common fillers from the token list for item extraction
    action_and_fillers = ADD_KEYWORDS | SELL_KEYWORDS | {
        "kara", "karo", "liya", "liye", "de", "do", "bhai", "bhaiya", "ji",
        "sir", "hai", "hain", "tha", "thi", "the", "gaya", "gaye", "gayi"
    }
    for tok, clean_w in zip(tokens, clean_words):
        if clean_w in action_and_fillers:
            continue
        cleaned_tokens.append(tok)

    return action, " ".join(cleaned_tokens)

def parse_single_clause(clause: str, parent_action: Optional[ActionType] = None) -> Optional[ParsedAction]:
    if not clause.strip():
        return None
    
    # Extract price first
    price, text_no_price = extract_price(clause)
    
    # Determine action (add/sell)
    action, text_clean = determine_action(text_no_price, default_action=parent_action)

    # Convert word numbers to digits
    words = text_clean.split()
    processed_words = []
    for w in words:
        w_lower = w.lower()
        if w_lower in WORD_NUMBERS:
            processed_words.append(str(WORD_NUMBERS[w_lower]))
        else:
            processed_words.append(w)
    normalized_clause = " ".join(processed_words)
    # Separate attached units (e.g. 10kg -> 10 kg, 5L -> 5 L)
    normalized_clause = re.sub(r"(\d+(?:\.\d+)?)([a-zA-Z]+)", r"\1 \2", normalized_clause)

    # Find the number in normalized_clause
    tokens = normalized_clause.split()
    number_idx = -1
    qty = 0.0
    for idx, tok in enumerate(tokens):
        try:
            qty = float(tok)
            number_idx = idx
            break
        except ValueError:
            continue

    if number_idx == -1:
        return None

    # We found the number at number_idx
    before_tokens = tokens[:number_idx]
    after_tokens = tokens[number_idx + 1:]

    unit = "pcs"
    raw_item = ""

    # Case A: Unit is immediately after the number (e.g. 10 kg rice OR cheeni 10 kg)
    if after_tokens and after_tokens[0].lower() in UNIT_MAP:
        unit = normalize_unit(after_tokens[0])
        remaining_after = after_tokens[1:]
        if remaining_after:
            # Qty Unit Item (e.g. "10 kg chawal", "5 l tel")
            raw_item = " ".join(remaining_after)
        elif before_tokens:
            # Item Qty Unit (e.g. "cheeni 10 kilo", "dudh 2 liter")
            raw_item = " ".join(before_tokens)
    # Case B: No unit after number, but item is after number (e.g. "2 bread")
    elif after_tokens:
        unit = "pcs"
        raw_item = " ".join(after_tokens)
    # Case C: Item is before number (e.g. "bread 2")
    elif before_tokens:
        unit = "pcs"
        raw_item = " ".join(before_tokens)

    item_name = normalize_item_name(raw_item)
    if not item_name:
        return None

    return ParsedAction(
        action=action,
        item_name=item_name,
        quantity=qty,
        unit=unit,
        price=price
    )

def parse_message(raw_text: str) -> ParseResult:
    text = (raw_text or "").strip()
    if not text:
        return ParseResult(error="Empty message", raw_text=text)

    # Check for direct commands
    cmd = parse_command(text)
    if cmd:
        return ParseResult(is_command=True, command=cmd, raw_text=text)

    # Determine leading or trailing parent action if whole message starts/ends with Add/Sold keywords
    parent_action: Optional[ActionType] = None
    lower_text = text.lower()
    clean_words = re.sub(r"[^\w\s-]", " ", lower_text).split()
    if clean_words:
        first_word = clean_words[0]
        last_word = clean_words[-1]
        if first_word in ADD_KEYWORDS or last_word in ADD_KEYWORDS:
            parent_action = "ADD"
        elif first_word in SELL_KEYWORDS or last_word in SELL_KEYWORDS or "bik gaya" in lower_text or "bik gaye" in lower_text:
            parent_action = "SELL"

    # Split into multi-item chunks (commas, 'and', 'aur', 'ani', newlines)
    # Be careful not to split inside numbers or words
    clauses = re.split(r",|\n|\band\b|\baur\b|\bani\b|\btatha\b", text, flags=re.IGNORECASE)

    actions: List[ParsedAction] = []
    for clause in clauses:
        clause_str = clause.strip()
        if not clause_str:
            continue
        parsed = parse_single_clause(clause_str, parent_action=parent_action)
        if parsed:
            actions.append(parsed)

    if not actions:
        return ParseResult(
            error="Could not parse items from message",
            raw_text=text
        )

    return ParseResult(
        is_command=False,
        actions=actions,
        raw_text=text
    )
