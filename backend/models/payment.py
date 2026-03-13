from sqlalchemy import Column, String, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from database import Base

class Payment(Base):
    __tablename__ = "payments"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id     = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    order_id       = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=True)
    amount         = Column(Numeric(14, 4), nullable=False)
    payment_method = Column(String(20), nullable=False)
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("transactions.id"), nullable=True)
    notes          = Column(String, nullable=True)
    created_by     = Column(UUID(as_uuid=True), nullable=True)
    created_at     = Column(String, server_default=func.now())
    