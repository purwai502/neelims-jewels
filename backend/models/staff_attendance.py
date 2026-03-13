from sqlalchemy import Column, String, Date, Time, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from database import Base

class StaffAttendance(Base):
    __tablename__ = "staff_attendance"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(UUID(as_uuid=True), nullable=False)
    date       = Column(Date, nullable=False)
    status     = Column(String(20), default="PRESENT")
    check_in   = Column(Time, nullable=True)
    check_out  = Column(Time, nullable=True)
    notes      = Column(Text, nullable=True)
    marked_by  = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(String, nullable=True)
    