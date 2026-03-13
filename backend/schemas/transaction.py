from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class TransactionCreate(BaseModel):
    debit_account_id: UUID
    credit_account_id: UUID
    amount: float
    gold_weight: Optional[float] = None
    gold_purity: Optional[str] = None
    reference_type: str
    reference_id: Optional[UUID] = None
    related_transaction_id: Optional[UUID] = None
    notes: Optional[str] = None

class TransactionOut(BaseModel):
    id: UUID
    date: Optional[datetime] = None
    debit_account_id: UUID
    credit_account_id: UUID
    amount: float
    gold_weight: Optional[float]
    gold_purity: Optional[str]
    gold_rate_snapshot: Optional[float]
    reference_type: str
    reference_id: Optional[UUID]
    related_transaction_id: Optional[UUID]
    notes: Optional[str]

    class Config:
        from_attributes = True
        