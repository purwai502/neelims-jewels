from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from database import Base

class Vendor(Base):
    __tablename__ = "vendors"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id     = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False, unique=True)
    business_name  = Column(String(255), nullable=False)
    contact_person = Column(String(255), nullable=True)
    phone          = Column(String(50), nullable=True)
    email          = Column(String(255), nullable=True)
    address        = Column(String, nullable=True)
    notes          = Column(String, nullable=True)
    gst_number     = Column(String(50), nullable=True)
    tin_number     = Column(String(50), nullable=True)
    pan_number     = Column(String(50), nullable=True)
    created_by     = Column(UUID(as_uuid=True), nullable=True)
    created_at     = Column(String, server_default=func.now())
    