from sqlalchemy import Column, String, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from database import Base

class Product(Base):
    __tablename__ = "products"

    id                 = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name               = Column(String(255), nullable=False)
    description        = Column(String, nullable=True)
    weight             = Column(Numeric(10, 4), nullable=False)
    purity             = Column(String(10), ForeignKey("purities.code"), nullable=False)
    making_charges     = Column(Numeric(12, 4), nullable=False, default=0)
    gold_rate_snapshot = Column(Numeric(12, 4), nullable=False)
    total_price = Column(Numeric(14, 4), nullable=True)
    order_id           = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=True)
    barcode = Column(String(50), nullable=True, unique=True)
    image_path = Column(String(255), nullable=True)
    created_by         = Column(UUID(as_uuid=True), nullable=True)
    created_at         = Column(String, server_default=func.now())
