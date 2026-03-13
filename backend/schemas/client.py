from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID

class ClientCreate(BaseModel):
    full_name: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    notes: Optional[str] = None

class ClientOut(BaseModel):
    id: UUID
    account_id: UUID
    full_name: str
    phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    notes: Optional[str]

    class Config:
        from_attributes = True
        