from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.core.time_utils import get_ist_now

class Item(Base):
    __tablename__ = "items"
    __table_args__ = (
        UniqueConstraint("vendor", "name", name="uq_vendor_item_name"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    vendor = Column(String(32), ForeignKey("vendors.phone"), nullable=False, index=True)
    name = Column(String(100), nullable=False, index=True)
    unit = Column(String(10), nullable=False)
    qty = Column(Float, default=0.0, nullable=False)
    threshold = Column(Float, default=5.0, nullable=False)
    price = Column(Float, nullable=True)
    reordered = Column(Boolean, default=False, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_ist_now, onupdate=get_ist_now, nullable=False)

    vendor_rel = relationship("Vendor", back_populates="items")
