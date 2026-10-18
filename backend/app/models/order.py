from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.core.time_utils import get_ist_now

class Order(Base):
    __tablename__ = "orders"

    id = Column(String(50), primary_key=True, index=True)  # e.g. ORD-20261018-8A3F
    customer_phone = Column(String(32), ForeignKey("customers.phone"), nullable=True, index=True)
    customer_name = Column(String(100), nullable=False)
    customer_address = Column(String(255), nullable=True)
    vendor_phone = Column(String(32), ForeignKey("vendors.phone"), nullable=False, index=True)

    request_type = Column(String(30), default="cart", nullable=False)  # cart, custom_text, image_list
    raw_text = Column(Text, nullable=True)  # customer free-text note / shopping list
    image_path = Column(String(255), nullable=True)  # uploaded shopping list / reference photo
    notes = Column(Text, nullable=True)  # delivery instructions or vendor notes

    # Statuses: New, Reviewing, Awaiting Price, Quote Sent, Awaiting Customer Approval, Confirmed, Preparing, Completed, Cancelled
    status = Column(String(50), default="New", nullable=False, index=True)
    price_status = Column(String(30), default="pending", nullable=False)  # pending, quoted, confirmed, paid

    subtotal = Column(Float, default=0.0, nullable=False)
    discount = Column(Float, default=0.0, nullable=False)
    tax_amount = Column(Float, default=0.0, nullable=False)
    delivery_charge = Column(Float, default=0.0, nullable=False)
    total_amount = Column(Float, default=0.0, nullable=False)

    stock_deducted = Column(Boolean, default=False, nullable=False)  # Prevents repeated deduction

    delivery_notification_status = Column(String(50), default="not_sent", nullable=False)  # sent, failed, retry
    delivery_notification_log = Column(Text, nullable=True)  # JSON audit trail of notifications

    created_at = Column(DateTime(timezone=True), default=get_ist_now, nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), default=get_ist_now, onupdate=get_ist_now, nullable=False)

    # Relationships
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan", order_by="OrderItem.id")
    bills = relationship("Bill", back_populates="order", cascade="all, delete-orphan", order_by="Bill.version.desc()")
    vendor_rel = relationship("Vendor")
    customer_rel = relationship("Customer")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    order_id = Column(String(50), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=True)

    product_name = Column(String(120), nullable=False)
    unit = Column(String(20), default="pcs", nullable=False)
    qty = Column(Float, default=1.0, nullable=False)
    unit_price = Column(Float, nullable=True)  # None if awaiting price
    line_total = Column(Float, default=0.0, nullable=False)

    price_source = Column(String(50), default="vendor", nullable=False)  # vendor, reference_online, manual_quote, unpriced
    reference_note = Column(String(255), nullable=True)  # Online source & date if estimated
    reference_confidence = Column(Float, nullable=True)  # e.g. 0.85

    in_stock = Column(Boolean, default=True, nullable=False)
    current_inventory_qty = Column(Float, nullable=True)
    is_confirmed_by_vendor = Column(Boolean, default=False, nullable=False)

    order = relationship("Order", back_populates="items")
    item_rel = relationship("Item")

