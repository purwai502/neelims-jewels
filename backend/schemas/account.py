from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class AccountCreate(BaseModel):
    name: str
    account_type: str

class AccountOut(BaseModel):
    id: UUID
    name: str
    account_type: str

    class Config:
        from_attributes = True

class AccountWithBalance(AccountOut):
    balance: float
    