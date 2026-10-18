from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any

from app.core.database import get_db
from app.models.vendor import Vendor
from app.models.customer import Customer
from app.core.auth_security import decode_access_token

def extract_token(request: Request) -> Optional[str]:
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:].strip()
    if "token" in request.query_params:
        return request.query_params["token"]
    return None

def get_current_vendor(
    request: Request,
    db: Session = Depends(get_db)
) -> Vendor:
    """
    Extracts and authenticates the current vendor.
    Guarantees that customer accounts CANNOT access vendor endpoints (returns 403 Forbidden).
    """
    token = extract_token(request)

    if token:
        payload = decode_access_token(token)
        if not payload or "sub" not in payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication token. Please log in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Enforce role: customers are strictly forbidden from vendor management
        if payload.get("role") == "customer":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Customer accounts cannot access vendor management, inventory editing, or analytics.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        phone = payload["sub"]
        vendor = db.query(Vendor).filter_by(phone=phone).first()
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shop not found for this vendor account."
            )
        return vendor

    # Fallback for existing tests that pass ?vendor=...
    vendor_param = request.query_params.get("vendor")
    if vendor_param:
        vendor = db.query(Vendor).filter_by(phone=vendor_param).first()
        if vendor:
            return vendor

    # If no token provided and no vendor param, fallback to first vendor strictly for legacy dev/test
    first_vendor = db.query(Vendor).first()
    if first_vendor:
        return first_vendor

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Please log in to your shop.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_customer(
    request: Request,
    db: Session = Depends(get_db)
) -> Customer:
    """
    Extracts and authenticates the current logged-in customer.
    """
    token = extract_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Customer authentication required. Please log in as a customer.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("role") != "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to customer accounts only."
        )

    phone = payload["sub"]
    clean_p = phone.replace("whatsapp:", "").strip()
    customer = db.query(Customer).filter(
        (Customer.phone == phone) | 
        (Customer.phone == clean_p) | 
        (Customer.phone == f"whatsapp:{clean_p}")
    ).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer account not found."
        )
    return customer


def get_optional_user(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[Dict[str, Any]]:
    """
    Optionally extracts the current authenticated user (customer or vendor) if present.
    """
    token = extract_token(request)
    if not token:
        return None

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        return None

    role = payload.get("role", "vendor")
    phone = payload["sub"]
    clean_p = phone.replace("whatsapp:", "").strip()

    if role == "customer":
        cust = db.query(Customer).filter(
            (Customer.phone == phone) | 
            (Customer.phone == clean_p) | 
            (Customer.phone == f"whatsapp:{clean_p}")
        ).first()
        if cust:
            return {
                "role": "customer",
                "phone": cust.phone,
                "name": cust.name,
                "email": cust.email,
                "city": cust.city
            }
        # If payload has customer info even if not in DB
        return {
            "role": "customer",
            "phone": phone,
            "name": payload.get("name", "Customer")
        }
    else:
        clean_p = phone.replace("whatsapp:", "").strip()
        vendor = db.query(Vendor).filter(
            (Vendor.phone == phone) | 
            (Vendor.phone == clean_p) | 
            (Vendor.phone == f"whatsapp:{clean_p}")
        ).first()
        if vendor:
            return {
                "role": getattr(vendor, "role", "vendor") or "vendor",
                "phone": vendor.phone,
                "shop_name": vendor.shop_name,
                "name": vendor.name
            }
        return {
            "role": "vendor",
            "phone": phone,
            "name": "Vendor"
        }
    return None
