from sqlalchemy import Column, String, Numeric, Date, Text
from sqlalchemy.dialects.postgresql import UUID
import uuid
from database import Base

class SalaryAdvance(Base):
    __tablename__ = "salary_advances"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id     = Column(UUID(as_uuid=True), nullable=False)
    amount      = Column(Numeric(12, 2), nullable=False)
    date        = Column(Date, nullable=False)
    reason      = Column(Text, nullable=True)
    status      = Column(String(20), default="PENDING")
    approved_by = Column(UUID(as_uuid=True), nullable=True)
    created_at  = Column(String, nullable=True)
    