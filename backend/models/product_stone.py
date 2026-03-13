from sqlalchemy import Column, String, Numeric, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from database import Base

class ProductStone(Base):
    __tablename__ = "product_stones"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id      = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    stone_name      = Column(String(100), nullable=False)
    weight          = Column(Numeric(10, 4), nullable=True)
    price_per_carat = Column(Numeric(12, 4), nullable=True)
    total_price     = Column(Numeric(12, 4), nullable=True)
    notes           = Column(String, nullable=True)
    created_at      = Column(String, nullable=True)
