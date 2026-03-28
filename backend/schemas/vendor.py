from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID

class VendorCreate(BaseModel):
    business_name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    gst_number: Optional[str] = None
    tin_number: Optional[str] = None
    pan_number: Optional[str] = None

class VendorOut(BaseModel):
    id: UUID
    account_id: UUID
    business_name: str
    contact_person: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    notes: Optional[str]
    gst_number: Optional[str]
    tin_number: Optional[str]
    pan_number: Optional[str]

    class Config:
        from_attributes = True
        