import pytest
from fastapi.testclient import TestClient
from app.core.security import hash_password, verify_password, sanitize_input, RateLimiter
from app.services.chat_preview import mask_phone_number

def test_password_hashing():
    raw_pass = "SecureKiranaStorePassword2026!"
    hashed = hash_password(raw_pass)
    assert ":" in hashed
    assert verify_password(hashed, raw_pass) is True
    assert verify_password(hashed, "WrongPassword") is False

def test_xss_sanitization():
    dirty1 = "<script>alert('xss')</script>Sugar"
    assert sanitize_input(dirty1) == "Sugar"

    dirty2 = "Bread<img src=x onerror=alert(1)>"
    assert "onerror" not in sanitize_input(dirty2)
    assert sanitize_input(dirty2) == "Bread"

    dirty3 = "javascript:alert(1)"
    assert "javascript" not in sanitize_input(dirty3)

def test_phone_masking():
    phone = "whatsapp:+919876543210"
    masked = mask_phone_number(phone)
    assert "+9198" in masked
    assert "210" in masked
    assert "*** **" in masked
    assert "987654" not in masked

def test_security_headers_present(client: TestClient):
    res = client.get("/health")
    assert res.status_code == 200
    headers = res.headers
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "DENY"
    assert headers.get("X-XSS-Protection") == "1; mode=block"
    assert "strict-origin-when-cross-origin" in headers.get("Referrer-Policy", "")
    assert "default-src 'self'" in headers.get("Content-Security-Policy", "")

def test_rate_limiter_blocks_excessive_requests():
    limiter = RateLimiter(max_requests=5, window_seconds=60)
    client_id = "test_attacker_ip"
    for _ in range(5):
        assert limiter.is_allowed(client_id) is True
    # 6th request should be blocked
    assert limiter.is_allowed(client_id) is False

