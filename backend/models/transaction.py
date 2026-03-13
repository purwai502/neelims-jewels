from sqlalchemy import Column, String, Numeric, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id                     = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    date                   = Column(DateTime(timezone=True), server_default=func.now())
    debit_account_id       = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    credit_account_id      = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    amount                 = Column(Numeric(14, 4), nullable=False)
    gold_weight            = Column(Numeric(10, 4), nullable=True)
    gold_purity            = Column(String(10), ForeignKey("purities.code"), nullable=True)
    gold_rate_snapshot     = Column(Numeric(12, 4), nullable=True)
    reference_type         = Column(String(20), nullable=False)
    reference_id           = Column(UUID(as_uuid=True), nullable=True)
    related_transaction_id = Column(UUID(as_uuid=True), ForeignKey("transactions.id"), nullable=True)
    notes                  = Column(String, nullable=True)
    created_by             = Column(UUID(as_uuid=True), nullable=True)
    created_at             = Column(DateTime(timezone=True), server_default=func.now())
    