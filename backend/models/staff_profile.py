from sqlalchemy import Column, String, Numeric, Boolean, Date, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from database import Base

class StaffProfile(Base):
    __tablename__ = "staff_profiles"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id        = Column(UUID(as_uuid=True), nullable=False, unique=True)
    phone          = Column(String(20), nullable=True)
    address        = Column(Text, nullable=True)
    join_date      = Column(Date, nullable=True)
    monthly_salary = Column(Numeric(12, 2), default=0)
    salary_type    = Column(String(20), default="MONTHLY")
    is_active      = Column(Boolean, default=True)
    notes          = Column(Text, nullable=True)
    created_at     = Column(String, nullable=True)
    