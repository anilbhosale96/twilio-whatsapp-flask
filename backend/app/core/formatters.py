def format_inr(amount: float) -> str:
    """Format a number into Indian Rupee grouping, e.g. 124500 -> Rs. 1,24,500"""
    if amount is None:
        return "Rs. 0"
    
    is_negative = amount < 0
    val = abs(amount)
    
    # Check if there is a decimal part
    dec_part = ""
    if val != int(val):
        dec_part = f"{val:.2f}".split(".")[1]
        dec_part = f".{dec_part}"
    
    int_str = str(int(val))
    if len(int_str) <= 3:
        grouped = int_str
    else:
        last_three = int_str[-3:]
        remaining = int_str[:-3]
        # Group remaining digits by 2 from right to left
        parts = []
        while remaining:
            parts.insert(0, remaining[-2:])
            remaining = remaining[:-2]
        grouped = ",".join(parts) + "," + last_three

    res = f"Rs. {grouped}{dec_part}"
    return f"-{res}" if is_negative else res

