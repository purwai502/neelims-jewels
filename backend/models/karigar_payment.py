from sqlalchemy import Column, String, Numeric, Date, Text
from sqlalchemy.dialects.postgresql import UUID
import uuid
from database import Base

class KarigarPayment(Base):
    __tablename__ = "karigar_payments"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    staff_id    = Column(UUID(as_uuid=True), nullable=False)   # references staff_profiles.id
    amount      = Column(Numeric(12, 2),     nullable=False)
    description = Column(Text,               nullable=True)
    payment_date = Column(Date,              nullable=False)
    order_id    = Column(UUID(as_uuid=True), nullable=True)
    notes       = Column(Text,               nullable=True)
    created_by  = Column(String,             nullable=True)
    created_at  = Column(String,             nullable=True)