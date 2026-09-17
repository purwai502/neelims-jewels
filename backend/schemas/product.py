from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from schemas.product_stone import ProductStoneCreate, ProductStoneOut

class ProductUpdate(BaseModel):
    name:           str
    description:    Optional[str]   = None
    weight:         float
    gold_weight:    Optional[float] = None
    purity:         Optional[str]   = None
    category:       Optional[str]   = None
    sub_category:   Optional[str]   = None
    making_charges: Optional[float] = 0
    total_price:    Optional[float] = None
    cost_price:     Optional[float] = None
    vendor_id:      Optional[UUID]  = None
    order_id:       Optional[UUID]  = None
    set_id:         Optional[UUID]  = None
    stones:         Optional[List[ProductStoneCreate]] = []

class ProductCreate(BaseModel):
    name:           str
    description:    Optional[str]   = None
    weight:         float
    gold_weight:    Optional[float] = None
    purity:         Optional[str]   = None
    category:       Optional[str]   = None
    sub_category:   Optional[str]   = None
    making_charges: Optional[float] = 0
    total_price:    Optional[float] = None
    cost_price:     Optional[float] = None
    vendor_id:      Optional[UUID]  = None
    order_id:       Optional[UUID]  = None
    set_id:         Optional[UUID]  = None
    stones:         Optional[List[ProductStoneCreate]] = []

    # On-approval (vendor consignment/memo) fields — only used when acquisition_type == "ON_APPROVAL"
    acquisition_type:      Optional[str]   = "PURCHASED"
    approval_received_date: Optional[str]  = None
    approval_due_date:      Optional[str]  = None
    # convenience: if approval_due_date isn't given, the router computes it as
    # approval_received_date + approval_period_days
    approval_period_days:   Optional[int]  = None

class ProductOut(BaseModel):
    id:                 UUID
    name:               str
    description:        Optional[str]
    weight:             float
    gold_weight:        Optional[float] = None
    purity:             Optional[str]   = None
    category:           Optional[str]   = None
    sub_category:       Optional[str]   = None
    making_charges:     float
    gold_rate_snapshot: float
    total_price:        Optional[float]
    cost_price:         Optional[float] = None
    vendor_id:          Optional[UUID]  = None
    order_id:           Optional[UUID]
    barcode:            Optional[str]
    image_path:         Optional[str] = None
    is_sold:            bool = False
    sold_to_client_id:  Optional[UUID] = None
    buyback_rate:       Optional[float] = None
    set_id:             Optional[UUID] = None
    stones:             Optional[List[ProductStoneOut]] = []

    acquisition_type:            str = "PURCHASED"
    approval_status:              Optional[str] = None
    approval_received_date:       Optional[str] = None
    approval_due_date:            Optional[str] = None
    approval_original_due_date:   Optional[str] = None
    approval_extension_count:     int = 0

    created_at: Optional[str] = None

    class Config:
        from_attributes = True
