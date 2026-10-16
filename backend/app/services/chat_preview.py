from typing import List, Dict, Any, Optional
from datetime import datetime
from app.core.time_utils import get_ist_now

def mask_phone_number(phone: str) -> str:
    """Masks a phone number for privacy, e.g. whatsapp:+919876543210 -> +91 98*** **210"""
    clean = phone.replace("whatsapp:", "").strip()
    if len(clean) >= 10:
        prefix = clean[:5]
        suffix = clean[-3:]
        return f"{prefix}*** **{suffix}"
    return clean

class ChatPreviewManager:
    def __init__(self, max_history: int = 50):
        self.max_history = max_history
        self.history: List[Dict[str, Any]] = []

    def add_message(
        self,
        phone: str,
        incoming_text: str,
        reply_text: str,
        is_voice: bool = False,
        transcript: Optional[str] = None,
        parsed_items: Optional[List[Dict[str, Any]]] = None
    ):
        entry = {
            "id": len(self.history) + 1,
            "sender_masked": mask_phone_number(phone),
            "phone_raw": phone,
            "incoming_text": incoming_text,
            "reply_text": reply_text,
            "is_voice": is_voice,
            "transcript": transcript,
            "parsed_items": parsed_items or [],
            "timestamp": get_ist_now().isoformat()
        }
        self.history.insert(0, entry)
        if len(self.history) > self.max_history:
            self.history.pop()

    def get_latest(self) -> Optional[Dict[str, Any]]:
        return self.history[0] if self.history else None

    def get_all(self) -> List[Dict[str, Any]]:
        return self.history

chat_preview_manager = ChatPreviewManager()

