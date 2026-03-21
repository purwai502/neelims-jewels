from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class ProductStoneCreate(BaseModel):
    stone_name:      str
    weight:          Optional[float] = None
    price_per_carat: Optional[float] = None
    total_price:     Optional[float] = None
    notes:           Optional[str]   = None

class ProductStoneOut(BaseModel):
    id:              UUID
    product_id:      UUID
    stone_name:      str
    weight:          Optional[float]
    price_per_carat: Optional[float]
    total_price:     Optional[float]
    notes:           Optional[str]

    class Config:
        from_attributes = True
        