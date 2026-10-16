import os
import re
import hmac
import hashlib
import time
from typing import Optional, Dict
from fastapi import HTTPException, Security, Request
from fastapi.security import APIKeyHeader
from app.core.config import settings

api_key_header = APIKeyHeader(name="X-API-KEY", auto_error=False)

def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with random 16-byte salt (600,000 iterations)."""
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 600_000)
    return f"{salt.hex()}:{key.hex()}"

def verify_password(stored_hash: str, password: str) -> bool:
    """Verify password against stored salt:hash using constant-time comparison."""
    try:
        salt_hex, key_hex = stored_hash.split(":")
        salt = bytes.fromhex(salt_hex)
        expected_key = bytes.fromhex(key_hex)
        key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 600_000)
        return hmac.compare_digest(key, expected_key)
    except Exception:
        return False

def sanitize_input(value: Optional[str]) -> Optional[str]:
    """Sanitize user strings against Cross-Site Scripting (XSS) and injection attacks."""
    if not value:
        return value
    # Remove script tags and tags with event handlers
    cleaned = re.sub(r"<\s*script[^>]*>.*?<\s*/\s*script\s*>", "", value, flags=re.IGNORECASE | re.DOTALL)
    cleaned = re.sub(r"on\w+\s*=", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"javascript\s*:", "", cleaned, flags=re.IGNORECASE)
    # Strip dangerous HTML tags
    cleaned = re.sub(r"<[^>]*>", "", cleaned)
    return cleaned.strip()

# Sliding Window Rate Limiter
class RateLimiter:
    def __init__(self, max_requests: int = 60, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.clients: Dict[str, list] = {}

    def is_allowed(self, client_id: str) -> bool:
        now = time.time()
        cutoff = now - self.window_seconds
        # Clean old timestamps
        timestamps = [t for t in self.clients.get(client_id, []) if t > cutoff]
        if len(timestamps) >= self.max_requests:
            self.clients[client_id] = timestamps
            return False
        timestamps.append(now)
        self.clients[client_id] = timestamps
        return True

rate_limiter = RateLimiter(max_requests=settings.RATE_LIMIT_PER_MINUTE, window_seconds=60)
