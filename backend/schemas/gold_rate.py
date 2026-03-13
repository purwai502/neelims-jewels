from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import date

class GoldRateCreate(BaseModel):
    price_per_gram_24k: float
    effective_date: date
    entered_by: Optional[str] = None

class GoldRateOut(BaseModel):
    id: UUID
    price_per_gram_24k: float
    effective_date: date
    entered_by: Optional[str]

    class Config:
        from_attributes = True

class GoldRateWithCalculated(GoldRateOut):
    rate_22k: float
    rate_18k: float
    rate_14k: float

class GoldRateOverrideCreate(BaseModel):
    gold_rate_id: UUID
    purity: str
    override_price: float
    reason: Optional[str] = None

class GoldRateOverrideOut(BaseModel):
    id: UUID
    gold_rate_id: UUID
    purity: str
    override_price: float
    reason: Optional[str]

    class Config:
        from_attributes = True
        