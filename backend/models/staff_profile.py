from sqlalchemy import Column, String, Numeric, Boolean, Date, Text
from sqlalchemy.dialects.postgresql import UUID
import uuid
from database import Base

class StaffProfile(Base):
    __tablename__ = "staff_profiles"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id        = Column(UUID(as_uuid=True), nullable=True, unique=True)  # nullable — staff may not have login
    full_name      = Column(String(100), nullable=False)
    phone          = Column(String(20),  nullable=True)
    email          = Column(String(100), nullable=True)
    address        = Column(Text,        nullable=True)
    join_date      = Column(Date,        nullable=True)
    staff_type     = Column(String(20),  default="EMPLOYEE")   # EMPLOYEE / KARIGAR / CONTRACTOR
    monthly_salary = Column(Numeric(12, 2), default=0)
    salary_type    = Column(String(20),  default="MONTHLY")
    contract_type  = Column(String(20),  default="FULL_TIME")
    day_rate       = Column(Numeric(12, 2), nullable=True)
    is_active      = Column(Boolean,     default=True)
    notes          = Column(Text,        nullable=True)
    created_at     = Column(String,      nullable=True)