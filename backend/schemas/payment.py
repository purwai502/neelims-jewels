from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class PaymentCreate(BaseModel):
    account_id:       UUID
    order_id:         Optional[UUID] = None
    amount:           float
    payment_method:   str
    notes:            Optional[str] = None
    gold_weight:      Optional[float] = None
    gold_purity:      Optional[str] = None
    gold_description: Optional[str] = None
    is_estimated:     Optional[bool] = False

class PaymentOut(BaseModel):
    id:             UUID
    account_id:     UUID
    order_id:       Optional[UUID]
    amount:         float
    payment_method: str
    transaction_id: Optional[UUID]
    notes:          Optional[str]

    class Config:
        from_attributes = True