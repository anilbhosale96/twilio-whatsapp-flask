from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.core.time_utils import get_ist_now

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    batch_id = Column(String(36), nullable=False, index=True)
    vendor = Column(String(32), ForeignKey("vendors.phone"), nullable=False, index=True)
    item_name = Column(String(100), nullable=False)
    unit = Column(String(10), nullable=False)
    change = Column(Float, nullable=False)
    price = Column(Float, nullable=True)
    raw_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=get_ist_now, nullable=False, index=True)
    undone = Column(Boolean, default=False, nullable=False)

    vendor_rel = relationship("Vendor", back_populates="transactions")

