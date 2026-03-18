from sqlalchemy import Column, String, Numeric, Date, Text
from sqlalchemy.dialects.postgresql import UUID
import uuid
from database import Base

class SalaryAdvance(Base):
    __tablename__ = "salary_advances"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    staff_id    = Column(UUID(as_uuid=True), nullable=False)   # references staff_profiles.id
    amount      = Column(Numeric(12, 2),     nullable=False)
    date        = Column(Date,               nullable=False)
    reason      = Column(Text,               nullable=True)
    notes       = Column(Text,               nullable=True)
    status      = Column(String(20),         default="PENDING")  # PENDING / REPAID
    approved_by = Column(String,             nullable=True)
    created_at  = Column(String,             nullable=True)