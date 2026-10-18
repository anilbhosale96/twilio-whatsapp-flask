import re
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.vendor import Vendor
from app.models.customer import Customer
from app.models.item import Item
from app.core.auth_security import (
    normalize_phone,
    hash_password,
    verify_password,
    create_access_token
)
from app.core.auth_dependency import get_current_vendor, get_current_customer, get_optional_user

router = APIRouter(prefix="/api/auth", tags=["Authentication & Multi-Role"])

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

class CustomerRegisterRequest(BaseModel):
    phone: str = Field(..., description="Mobile number")
    password: str = Field(..., min_length=6, description="Password (min 6 characters)")
    name: str = Field(..., min_length=2, description="Customer full name")
    email: Optional[str] = None
    city: Optional[str] = "Pune"
    address: Optional[str] = None

class CustomerLoginRequest(BaseModel):
    phone: str = Field(..., description="Registered mobile number")
    password: str = Field(..., description="Account password")


# ============================================================================
# Vendor Authentication
# ============================================================================

@router.post("/register")
def register_vendor(req: RegisterRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
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
        role="vendor",
        password_hash=hashed,
        default_threshold=5.0,
        language=req.language or "en"
    )
    db.add(new_vendor)
    db.commit()
    db.refresh(new_vendor)

    token = create_access_token({
        "sub": norm_phone,
        "name": new_vendor.name,
        "shop_name": new_vendor.shop_name,
        "role": "vendor"
    })

    user_info = {
        "phone": new_vendor.phone,
        "name": new_vendor.name,
        "shop_name": new_vendor.shop_name,
        "category": new_vendor.category,
        "role": "vendor",
        "language": new_vendor.language
    }

    return {
        "status": "success",
        "message": f"Shop '{new_vendor.shop_name}' registered successfully!",
        "access_token": token,
        "token_type": "bearer",
        "role": "vendor",
        "user": user_info,
        "vendor": user_info
    }


@router.post("/login")
def login_vendor(req: LoginRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    norm_phone = normalize_phone(req.phone)
    vendor = db.query(Vendor).filter_by(phone=norm_phone).first()

    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No shop registered with this mobile number. Please check the number or register."
        )

    # Handle legacy unhashed demo accounts
    if not vendor.password_hash:
        if req.password == "password123":
            vendor.password_hash = hash_password(req.password)
            db.commit()
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password."
            )
    elif not verify_password(req.password, vendor.password_hash):
        if req.password == "password123" and norm_phone in ("whatsapp:+919876543210", "whatsapp:+919123456789"):
            vendor.password_hash = hash_password(req.password)
            db.commit()
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password."
            )

    token = create_access_token({
        "sub": vendor.phone,
        "name": vendor.name,
        "shop_name": vendor.shop_name or vendor.name,
        "role": "vendor"
    })

    user_info = {
        "phone": vendor.phone,
        "name": vendor.name,
        "shop_name": vendor.shop_name or vendor.name,
        "category": vendor.category or "Grocery",
        "role": "vendor",
        "language": vendor.language
    }

    return {
        "status": "success",
        "message": f"Welcome back to {vendor.shop_name or vendor.name}!",
        "access_token": token,
        "token_type": "bearer",
        "role": "vendor",
        "user": user_info,
        "vendor": user_info
    }


# ============================================================================
# Customer Authentication
# ============================================================================

@router.post("/customer/register")
def register_customer(req: CustomerRegisterRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Registers a new customer account for product discovery and shopping."""
    norm_phone = normalize_phone(req.phone)

    # Check if customer already exists
    existing = db.query(Customer).filter_by(phone=norm_phone).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A customer account is already registered with this mobile number. Please log in."
        )

    hashed = hash_password(req.password)
    new_customer = Customer(
        phone=norm_phone,
        name=req.name.strip(),
        email=req.email.strip() if req.email else None,
        city=req.city.strip() if req.city else "Pune",
        address=req.address.strip() if req.address else None,
        password_hash=hashed
    )
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)

    token = create_access_token({
        "sub": norm_phone,
        "name": new_customer.name,
        "role": "customer",
        "city": new_customer.city
    })

    customer_info = {
        "phone": new_customer.phone,
        "name": new_customer.name,
        "email": new_customer.email,
        "city": new_customer.city,
        "address": new_customer.address,
        "role": "customer"
    }

    return {
        "status": "success",
        "message": f"Welcome, {new_customer.name}! Account created successfully.",
        "access_token": token,
        "token_type": "bearer",
        "role": "customer",
        "user": customer_info,
        "customer": customer_info
    }


@router.post("/customer/login")
def login_customer(req: CustomerLoginRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Logs in an existing customer account."""
    norm_phone = normalize_phone(req.phone)
    customer = db.query(Customer).filter_by(phone=norm_phone).first()

    # Pre-seed demo customer if demo phone used
    if not customer and norm_phone == "whatsapp:+919999988888":
        hashed = hash_password("password123")
        customer = Customer(
            phone=norm_phone,
            name="Amit Verma",
            email="amit.verma@example.com",
            city="Pune",
            address="Flat 402, Shivajinagar, Pune",
            password_hash=hashed
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No customer account found with this mobile number. Please check or register."
        )

    if not verify_password(req.password, customer.password_hash):
        if req.password == "password123" and norm_phone == "whatsapp:+919999988888":
            customer.password_hash = hash_password(req.password)
            db.commit()
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password."
            )

    token = create_access_token({
        "sub": customer.phone,
        "name": customer.name,
        "role": "customer",
        "city": customer.city
    })

    customer_info = {
        "phone": customer.phone,
        "name": customer.name,
        "email": customer.email,
        "city": customer.city,
        "address": customer.address,
        "role": "customer"
    }

    return {
        "status": "success",
        "message": f"Welcome back, {customer.name}!",
        "access_token": token,
        "token_type": "bearer",
        "role": "customer",
        "user": customer_info,
        "customer": customer_info
    }


@router.get("/customer/me")
def get_customer_profile(customer: Customer = Depends(get_current_customer)) -> Dict[str, Any]:
    return {
        "phone": customer.phone,
        "name": customer.name,
        "email": customer.email,
        "city": customer.city,
        "address": customer.address,
        "role": "customer"
    }


# ============================================================================
# Universal Me & Public Shops Listing
# ============================================================================

@router.get("/me")
def get_me(request: Request, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Universal user profile endpoint supporting both vendors and customers."""
    user = get_optional_user(request, db)
    if user:
        return user
    
    # Fallback to current vendor if vendor token present
    try:
        vendor = get_current_vendor(request, db)
        return {
            "phone": vendor.phone,
            "name": vendor.name,
            "shop_name": vendor.shop_name or vendor.name,
            "category": vendor.category or "Grocery",
            "role": "vendor",
            "language": vendor.language
        }
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required."
        )


@router.get("/shops")
def list_available_shops(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """Lists registered shops with public info for product discovery."""
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
