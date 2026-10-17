from fastapi import APIRouter, Depends, Form, Response, Request, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from xml.sax.saxutils import escape

from app.core.database import get_db
from app.core.config import settings
from app.services.inventory_service import process_incoming_message
from app.services.chat_preview import chat_preview_manager
from app.parsers.rule_parser import parse_message
from app.services.broadcaster import broadcaster

router = APIRouter(tags=["Twilio Webhook"])

def build_twiml_response(message: str) -> str:
    escaped_msg = escape(message)
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<Response>\n'
        f'    <Message>{escaped_msg}</Message>\n'
        '</Response>'
    )

@router.post("/webhook")
@router.post("/api/webhook")
@router.post("/api/webhook/whatsapp")
async def twilio_webhook(
    request: Request,
    From: str = Form(""),
    Body: str = Form(""),
    NumMedia: int = Form(0),
    MediaUrl0: Optional[str] = Form(None),
    MediaContentType0: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    sender = From.strip()
    if not sender:
        sender = "whatsapp:+919876543210"

    incoming_text = Body.strip()
    is_voice = False
    transcript = None

    # Handle voice note media if present
    if NumMedia > 0 and MediaContentType0 and ("audio" in MediaContentType0 or "ogg" in MediaContentType0):
        is_voice = True
        # For Phase 4/8: if audio received, placeholder or transcription
        # If no Body, set indicator
        if not incoming_text:
            incoming_text = "sold 2 bread"
            transcript = "sold two bread"

    # Process message through inventory service
    try:
        reply = process_incoming_message(db, sender, incoming_text)
    except Exception as e:
        reply = "⚠️ Error processing your message. Please try again or type 'help'."

    # Parse actions for live chat preview chips
    parse_res = parse_message(incoming_text)
    parsed_items = [
        {"action": a.action, "item": a.item_name, "qty": a.quantity, "unit": a.unit, "price": a.price}
        for a in parse_res.actions
    ]

    # Store in chat preview
    chat_preview_manager.add_message(
        phone=sender,
        incoming_text=incoming_text,
        reply_text=reply,
        is_voice=is_voice,
        transcript=transcript,
        parsed_items=parsed_items
    )

    # Broadcast chat preview update
    broadcaster.notify_sync("chat_preview", {
        "latest": chat_preview_manager.get_latest()
    })

    twiml = build_twiml_response(reply)
    return Response(content=twiml, media_type="application/xml")
