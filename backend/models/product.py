from sqlalchemy import Column, String, Numeric, ForeignKey, Boolean
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
    gold_weight        = Column(Numeric(10, 4), nullable=True)
    purity             = Column(String(10), nullable=True)
    category           = Column(String(50), nullable=True)
    sub_category       = Column(String(50), nullable=True)
    making_charges     = Column(Numeric(12, 4), nullable=False, default=0)
    gold_rate_snapshot = Column(Numeric(12, 4), nullable=False, server_default="0")
    total_price        = Column(Numeric(14, 4), nullable=True)
    cost_price         = Column(Numeric(14, 4), nullable=True)
    vendor_id          = Column(UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=True)
    order_id           = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=True)
    barcode            = Column(String(50), nullable=True, unique=True)
    image_path         = Column(String(255), nullable=True)
    is_sold            = Column(Boolean, nullable=False, default=False)
    sold_to_client_id  = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)
    buyback_rate       = Column(Numeric(5, 4), nullable=True, default=0.8)
    set_id             = Column(UUID(as_uuid=True), ForeignKey("product_sets.id"), nullable=True)
    created_by         = Column(UUID(as_uuid=True), nullable=True)
    created_at         = Column(String, server_default=func.now())
