from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.core.time_utils import get_ist_now

class Bill(Base):
    __tablename__ = "bills"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    bill_number = Column(String(50), unique=True, nullable=False, index=True)  # e.g. INV-20261018-001 or QTE-20261018-001
    order_id = Column(String(50), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    vendor_phone = Column(String(32), ForeignKey("vendors.phone"), nullable=False, index=True)
    customer_phone = Column(String(32), nullable=True)

    bill_type = Column(String(20), default="quotation", nullable=False)  # "quotation" or "invoice"
    version = Column(Integer, default=1, nullable=False)  # Increments for revisions to maintain audit trail

    issue_date = Column(DateTime(timezone=True), default=get_ist_now, nullable=False)

    subtotal = Column(Float, nullable=False, default=0.0)
    discount = Column(Float, default=0.0, nullable=False)
    tax_rate = Column(Float, default=0.0, nullable=False)  # e.g. 5.0 for 5%
    cgst_amount = Column(Float, default=0.0, nullable=False)
    sgst_amount = Column(Float, default=0.0, nullable=False)
    igst_amount = Column(Float, default=0.0, nullable=False)
    delivery_charge = Column(Float, default=0.0, nullable=False)
    final_total = Column(Float, nullable=False, default=0.0)

    payment_status = Column(String(20), default="unpaid", nullable=False)  # "unpaid", "paid", "cancelled"
    payment_method = Column(String(50), nullable=True)  # "Cash", "UPI", "Card", etc.

    vendor_gstin = Column(String(20), nullable=True)
    items_json = Column(Text, nullable=False)  # JSON snapshot of all line items, rates, taxes
    notes = Column(Text, nullable=True)
    pdf_path = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), default=get_ist_now, nullable=False)

    order = relationship("Order", back_populates="bills")
    vendor_rel = relationship("Vendor")
