from sqlalchemy import Column, String, Numeric, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from database import Base

class SalaryPayment(Base):
    __tablename__ = "salary_payments"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id        = Column(UUID(as_uuid=True), nullable=False)
    month          = Column(Integer, nullable=False)
    year           = Column(Integer, nullable=False)
    base_salary    = Column(Numeric(12, 2), nullable=False)
    advances       = Column(Numeric(12, 2), default=0)
    deductions     = Column(Numeric(12, 2), default=0)
    bonus          = Column(Numeric(12, 2), default=0)
    final_amount   = Column(Numeric(12, 2), nullable=False)
    status         = Column(String(20), default="PENDING")
    payment_method = Column(String(20), nullable=True)
    paid_at        = Column(String, nullable=True)
    notes          = Column(Text, nullable=True)
    created_by     = Column(UUID(as_uuid=True), nullable=True)
    created_at     = Column(String, nullable=True)
    