from sqlalchemy import Column, String, DateTime
from app.core.database import Base
from app.core.time_utils import get_ist_now

class Customer(Base):
    __tablename__ = "customers"

    phone = Column(String(32), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True, default="Pune")
    address = Column(String(255), nullable=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=get_ist_now, nullable=False)

