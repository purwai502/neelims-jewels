from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class OrderCreate(BaseModel):
    client_id: Optional[UUID] = None
    vendor_id: Optional[UUID] = None
    estimated_weight: Optional[float] = None
    estimated_purity: Optional[str] = None
    estimated_price: Optional[float] = None
    notes: Optional[str] = None

class OrderUpdate(BaseModel):
    vendor_id: Optional[UUID] = None
    estimated_weight: Optional[float] = None
    estimated_purity: Optional[str] = None
    estimated_price: Optional[float] = None
    final_price: Optional[float] = None
    notes: Optional[str] = None

from datetime import datetime

class OrderOut(BaseModel):
    id: UUID
    client_id: Optional[UUID]
    vendor_id: Optional[UUID]
    status: str
    estimated_weight: Optional[float]
    estimated_purity: Optional[str]
    estimated_price: Optional[float]
    final_price: Optional[float]
    notes: Optional[str]
    locked_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        
