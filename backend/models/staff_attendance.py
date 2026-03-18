from sqlalchemy import Column, String, Date, Time, Text
from sqlalchemy.dialects.postgresql import UUID
import uuid
from database import Base

class StaffAttendance(Base):
    __tablename__ = "staff_attendance"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    staff_id   = Column(UUID(as_uuid=True), nullable=False)   # references staff_profiles.id
    date       = Column(Date,    nullable=False)
    status     = Column(String(20), default="PRESENT")        # PRESENT / ABSENT / HALF_DAY
    leave_type = Column(String(20), nullable=True)
    notes      = Column(Text,    nullable=True)
    marked_by  = Column(String,  nullable=True)
    created_at = Column(String,  nullable=True)