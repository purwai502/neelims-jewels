from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from database import Base

class Account(Base):
    __tablename__ = "accounts"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name         = Column(String(255), nullable=False)
    account_type = Column(String(20), nullable=False)
    created_by   = Column(UUID(as_uuid=True), nullable=True)
    created_at   = Column(String, server_default=func.now())