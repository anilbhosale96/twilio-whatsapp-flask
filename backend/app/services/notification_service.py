import json
from typing import Optional, Dict, Any
from datetime import datetime
from app.core.config import settings
from app.core.time_utils import get_ist_now
from app.services.broadcaster import broadcaster

def send_whatsapp_or_sms_notification(
    recipient_phone: str,
    message_text: str,
    media_url: Optional[str] = None,
    channel: str = "whatsapp"
) -> Dict[str, Any]:
    """
    Attempts to send quotation or bill update via Twilio WhatsApp / SMS if configured.
    Supports channel selection: 'whatsapp' or 'sms'.
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
            "recipient": recipient_phone,
            "channel": channel
        }

    try:
        from twilio.rest import Client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

        clean_recipient = recipient_phone.replace("whatsapp:", "").strip()

        if channel == "sms":
            from_number = settings.TWILIO_PHONE_NUMBER
            if not from_number:
                return {
                    "success": False,
                    "status": "skipped",
                    "reason": "TWILIO_PHONE_NUMBER is not configured for SMS.",
                    "timestamp": timestamp,
                    "recipient": recipient_phone,
                    "channel": "sms"
                }
            to_number = clean_recipient if clean_recipient.startswith("+") else f"+{clean_recipient}"
        else:
            from_number = settings.TWILIO_WHATSAPP_NUMBER
            if not from_number:
                return {
                    "success": False,
                    "status": "skipped",
                    "reason": "TWILIO_WHATSAPP_NUMBER is not configured for WhatsApp.",
                    "timestamp": timestamp,
                    "recipient": recipient_phone,
                    "channel": "whatsapp"
                }
            if not from_number.startswith("whatsapp:"):
                from_number = f"whatsapp:{from_number}"
            to_number = f"whatsapp:{clean_recipient}"

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
            "recipient": recipient_phone,
            "channel": channel
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

