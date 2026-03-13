from sqlalchemy import Column, String, Boolean, Time
from sqlalchemy.dialects.postgresql import UUID
import uuid
from database import Base

class StaffSchedule(Base):
    __tablename__ = "staff_schedules"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id     = Column(UUID(as_uuid=True), nullable=False)
    day_of_week = Column(String(10), nullable=False)
    shift_start = Column(Time, nullable=True)
    shift_end   = Column(Time, nullable=True)
    is_working  = Column(Boolean, default=True)
    