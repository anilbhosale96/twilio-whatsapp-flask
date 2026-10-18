from sqlalchemy import Column, String, Float, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.core.time_utils import get_ist_now

class Vendor(Base):
    __tablename__ = "vendors"

    phone = Column(String(32), primary_key=True, index=True)
    name = Column(String(100), nullable=True)
    shop_name = Column(String(100), nullable=True)
    category = Column(String(50), default="Grocery", nullable=False)
    role = Column(String(20), default="vendor", nullable=False)
    gstin = Column(String(20), nullable=True)
    address = Column(String(255), nullable=True)
    password_hash = Column(String(255), nullable=True)
    default_threshold = Column(Float, default=5.0, nullable=False)
    language = Column(String(10), default="en", nullable=False)
    created_at = Column(DateTime(timezone=True), default=get_ist_now, nullable=False)

    items = relationship("Item", back_populates="vendor_rel", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="vendor_rel", cascade="all, delete-orphan")

