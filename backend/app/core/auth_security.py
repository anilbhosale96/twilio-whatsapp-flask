import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import time
from datetime import timedelta
from typing import Optional, Dict, Any

from app.core.config import settings

# Secret key for HMAC token signing
_AUTH_SECRET = getattr(settings, "AUTH_SECRET", "smart-stack-ai-jwt-secret-key-2026-production")
_TOKEN_EXPIRY_DAYS = 30

def normalize_phone(raw: str) -> str:
    """
    Normalizes any mobile input into canonical 'whatsapp:+91XXXXXXXXXX' format.
    Accepts: '+91 98765 43210', '9876543210', 'whatsapp:+919876543210', etc.
    """
    cleaned = raw.strip()
    if cleaned.lower().startswith("whatsapp:"):
        cleaned = cleaned[9:].strip()
    digits = re.sub(r"[^\d+]", "", cleaned)
    if digits.startswith("+"):
        num = digits[1:]
    else:
        num = digits
    if len(num) == 10:
        num = "91" + num
    return f"whatsapp:+{num}"

def hash_password(password: str) -> str:
    """Hashes a password with PBKDF2-HMAC-SHA256 and a random 16-byte salt."""
    salt = secrets.token_bytes(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    return f"pbkdf2_sha256${salt.hex()}${key.hex()}"

def verify_password(plain_password: str, hashed_password: Optional[str]) -> bool:
    """Verifies a plain password against the stored PBKDF2 hash."""
    if not hashed_password:
        return False
    try:
        parts = hashed_password.split("$")
        if len(parts) != 3 or parts[0] != "pbkdf2_sha256":
            return False
        salt = bytes.fromhex(parts[1])
        expected_key = bytes.fromhex(parts[2])
        computed_key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, 100_000)
        return secrets.compare_digest(computed_key, expected_key)
    except Exception:
        return False

def _b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")

def _b64decode(s: str) -> bytes:
    padding = "=" * ((4 - len(s) % 4) % 4)
    return base64.urlsafe_b64decode(s + padding)

def create_access_token(payload: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Creates a self-contained signed token (similar to JWT) using HMAC-SHA256."""
    header = {"alg": "HS256", "typ": "JWT"}
    exp = int(time.time() + (expires_delta.total_seconds() if expires_delta else _TOKEN_EXPIRY_DAYS * 86400))
    token_payload = {**payload, "exp": exp, "iat": int(time.time())}

    header_b64 = _b64encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64encode(json.dumps(token_payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")

    sig = hmac.new(_AUTH_SECRET.encode("utf-8"), signing_input, hashlib.sha256).digest()
    sig_b64 = _b64encode(sig)

    return f"{header_b64}.{payload_b64}.{sig_b64}"

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates token signature and expiry. Returns payload or None."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, payload_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
        expected_sig = hmac.new(_AUTH_SECRET.encode("utf-8"), signing_input, hashlib.sha256).digest()
        provided_sig = _b64decode(sig_b64)

        if not secrets.compare_digest(expected_sig, provided_sig):
            return None

        payload_bytes = _b64decode(payload_b64)
        payload = json.loads(payload_bytes.decode("utf-8"))

        if "exp" in payload and time.time() > payload["exp"]:
            return None

        return payload
    except Exception:
        return None

