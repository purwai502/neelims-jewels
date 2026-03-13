from sqlalchemy import Column, String, Numeric, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from database import Base

class GoldRate(Base):
    __tablename__ = "gold_rates"

    id                 = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    price_per_gram_24k = Column(Numeric(12, 4), nullable=False)
    effective_date     = Column(Date, nullable=False, unique=True)
    entered_by         = Column(String(255), nullable=True)
    created_by         = Column(UUID(as_uuid=True), nullable=True)
    created_at         = Column(String, server_default=func.now())


class GoldRateOverride(Base):
    __tablename__ = "gold_rate_overrides"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    gold_rate_id   = Column(UUID(as_uuid=True), ForeignKey("gold_rates.id"), nullable=False)
    purity         = Column(String(10), ForeignKey("purities.code"), nullable=False)
    override_price = Column(Numeric(12, 4), nullable=False)
    reason         = Column(String, nullable=True)
    created_at     = Column(String, server_default=func.now())
    