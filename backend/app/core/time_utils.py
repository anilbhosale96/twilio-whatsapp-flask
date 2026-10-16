from datetime import datetime, timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30))

def get_ist_now() -> datetime:
    """Return current datetime in Indian Standard Time (IST)."""
    return datetime.now(IST)
