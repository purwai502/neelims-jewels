from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from schemas.product_stone import ProductStoneCreate, ProductStoneOut

class ProductCreate(BaseModel):
    name:           str
    description:    Optional[str]   = None
    weight:         float
    purity:         str
    making_charges: Optional[float] = 0
    order_id:       Optional[UUID]  = None
    stones:         Optional[List[ProductStoneCreate]] = []

class ProductOut(BaseModel):
    id:                 UUID
    name:               str
    description:        Optional[str]
    weight:             float
    purity:             str
    making_charges:     float
    gold_rate_snapshot: float
    total_price:        Optional[float]
    order_id:           Optional[UUID]
    barcode:            Optional[str]
    image_path: Optional[str] = None
    stones:             Optional[List[ProductStoneOut]] = []

    class Config:
        from_attributes = True

