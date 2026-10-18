import json
from typing import Optional, Dict, Any
from datetime import datetime
from app.core.config import settings
from app.core.time_utils import get_ist_now
from app.services.broadcaster import broadcaster

def send_whatsapp_or_sms_notification(
    recipient_phone: str,
    message_text: str,
    media_url: Optional[str] = None
) -> Dict[str, Any]:
    """
    Attempts to send quotation or bill update via Twilio WhatsApp / SMS if configured.
    Never fails or throws an exception if Twilio is unconfigured or unavailable.
    Records delivery attempt, timestamp, channel, and error status for the audit log.
    """
    timestamp = get_ist_now().isoformat()

    # Check if Twilio is configured
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        return {
            "success": False,
            "status": "skipped",
            "reason": "Twilio credentials not configured in environment.",
            "timestamp": timestamp,
            "recipient": recipient_phone
        }

    try:
        from twilio.rest import Client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

        from_number = settings.TWILIO_WHATSAPP_NUMBER
        to_number = recipient_phone
        if not to_number.startswith("whatsapp:") and "whatsapp" in from_number:
            to_number = f"whatsapp:{to_number.replace('+', '')}"

        kwargs = {
            "from_": from_number,
            "to": to_number,
            "body": message_text
        }
        if media_url:
            kwargs["media_url"] = [media_url]

        msg = client.messages.create(**kwargs)

        return {
            "success": True,
            "status": "delivered",
            "sid": msg.sid,
            "timestamp": timestamp,
            "recipient": recipient_phone
        }
    except Exception as e:
        return {
            "success": False,
            "status": "failed",
            "error": str(e),
            "timestamp": timestamp,
            "recipient": recipient_phone
        }

def log_notification_event(
    current_log_json: Optional[str],
    event_data: Dict[str, Any]
) -> str:
    """Appends an event to the order's JSON audit log."""
    logs = []
    if current_log_json:
        try:
            parsed = json.loads(current_log_json)
            if isinstance(parsed, list):
                logs = parsed
        except Exception:
            pass

    logs.append(event_data)
    return json.dumps(logs, ensure_ascii=False)
