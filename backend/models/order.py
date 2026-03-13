from sqlalchemy import Column, String, Numeric, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from database import Base

class Order(Base):
    __tablename__ = "orders"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id        = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)
    vendor_id        = Column(UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=True)
    status           = Column(String(20), nullable=False, default="DRAFT")
    estimated_weight = Column(Numeric(10, 4), nullable=True)
    estimated_purity = Column(String(10), ForeignKey("purities.code"), nullable=True)
    estimated_price  = Column(Numeric(14, 4), nullable=True)
    final_price      = Column(Numeric(14, 4), nullable=True)
    notes            = Column(String, nullable=True)
    created_by       = Column(UUID(as_uuid=True), nullable=True)
    created_at       = Column(String, server_default=func.now())
    locked_at = Column(DateTime(timezone=True), nullable=True)



