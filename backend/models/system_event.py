from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from database import Base

class SystemEvent(Base):
    __tablename__ = "system_events"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type   = Column(String(20), nullable=False)
    performed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    notes        = Column(String, nullable=True)
    created_at   = Column(String, server_default=func.now())
    