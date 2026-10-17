import re
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.vendor import Vendor
from app.models.item import Item
from app.core.auth_security import (
    normalize_phone,
    hash_password,
    verify_password,
    create_access_token
)
from app.core.auth_dependency import get_current_vendor

router = APIRouter(prefix="/api/auth", tags=["Authentication & Multi-Shop"])

class RegisterRequest(BaseModel):
    phone: str = Field(..., description="Mobile number / WhatsApp number")
    password: str = Field(..., min_length=6, description="Password (min 6 characters)")
    owner_name: str = Field(..., min_length=2, description="Shop owner full name")
    shop_name: str = Field(..., min_length=2, description="Shop / Business name")
    category: Optional[str] = Field("Grocery", description="Shop category (Grocery, Pharmacy, etc.)")
    email: Optional[str] = None
    language: Optional[str] = "en"

class LoginRequest(BaseModel):
    phone: str = Field(..., description="Registered mobile number / WhatsApp number")
    password: str = Field(..., description="Shop account password")

# Sample starter inventory for newly registered shops
STARTER_ITEMS = {
    "Grocery": [
        ("rice", "kg", 50.0, 10.0, 60.0),
        ("sugar", "kg", 25.0, 5.0, 44.0),
        ("oil", "l", 20.0, 5.0, 140.0),
        ("bread", "pcs", 10.0, 4.0, 25.0),
        ("milk", "packet", 15.0, 5.0, 32.0),
    ],
    "Pharmacy": [
        ("paracetamol", "strip", 40.0, 10.0, 20.0),
        ("antiseptic liquid", "bottle", 15.0, 5.0, 65.0),
        ("band-aid", "box", 25.0, 8.0, 50.0),
        ("cough syrup", "bottle", 12.0, 4.0, 85.0),
    ],
    "General Store": [
        ("soap", "box", 30.0, 8.0, 38.0),
        ("shampoo", "bottle", 20.0, 5.0, 120.0),
        ("toothpaste", "tube", 25.0, 6.0, 55.0),
        ("detergent", "packet", 15.0, 4.0, 95.0),
    ]
}

@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    norm_phone = normalize_phone(req.phone)

    # Check if vendor already exists
    existing = db.query(Vendor).filter_by(phone=norm_phone).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A shop is already registered with this mobile number. Please log in."
        )

    # Hash the password securely
    hashed = hash_password(req.password)

    new_vendor = Vendor(
        phone=norm_phone,
        name=req.owner_name.strip(),
        shop_name=req.shop_name.strip(),
        category=req.category.strip() if req.category else "Grocery",
        password_hash=hashed,
        default_threshold=5.0,
        language=req.language or "en"
    )
    db.add(new_vendor)
    db.commit()
    db.refresh(new_vendor)

    # Brand new shop starts with clean zero inventory (ready for vendor's own products)
    db.commit()

    token = create_access_token({
        "sub": norm_phone,
        "name": new_vendor.name,
        "shop_name": new_vendor.shop_name
    })

    return {
        "status": "success",
        "message": f"Shop '{new_vendor.shop_name}' registered successfully!",
        "access_token": token,
        "token_type": "bearer",
        "vendor": {
            "phone": new_vendor.phone,
            "name": new_vendor.name,
            "shop_name": new_vendor.shop_name,
            "category": new_vendor.category,
            "language": new_vendor.language
        }
    }

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    norm_phone = normalize_phone(req.phone)
    vendor = db.query(Vendor).filter_by(phone=norm_phone).first()

    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No shop registered with this mobile number. Please check the number or register."
        )

    # Handle legacy unhashed demo accounts
    if not vendor.password_hash:
        # If legacy password matches default 'password123', upgrade and save hash
        if req.password == "password123":
            vendor.password_hash = hash_password(req.password)
            db.commit()
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password."
            )
    elif not verify_password(req.password, vendor.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password."
        )

    token = create_access_token({
        "sub": vendor.phone,
        "name": vendor.name,
        "shop_name": vendor.shop_name or vendor.name
    })

    return {
        "status": "success",
        "message": f"Welcome back to {vendor.shop_name or vendor.name}!",
        "access_token": token,
        "token_type": "bearer",
        "vendor": {
            "phone": vendor.phone,
            "name": vendor.name,
            "shop_name": vendor.shop_name or vendor.name,
            "category": vendor.category or "Grocery",
            "language": vendor.language
        }
    }

@router.get("/me")
def get_me(current_vendor: Vendor = Depends(get_current_vendor)) -> Dict[str, Any]:
    return {
        "phone": current_vendor.phone,
        "name": current_vendor.name,
        "shop_name": current_vendor.shop_name or current_vendor.name,
        "category": current_vendor.category or "Grocery",
        "default_threshold": current_vendor.default_threshold,
        "language": current_vendor.language
    }

@router.get("/shops")
def list_available_shops(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """Lists registered shops with public info for quick switching/demo preview."""
    vendors = db.query(Vendor).all()
    out = []
    for v in vendors:
        out.append({
            "phone": v.phone,
            "name": v.name,
            "shop_name": v.shop_name or v.name,
            "category": v.category or "Grocery"
        })
    return out

