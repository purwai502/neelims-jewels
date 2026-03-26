from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID

class ProductSetCreate(BaseModel):
    name: str

class ProductSetOut(BaseModel):
    id:   UUID
    name: str

    class Config:
        from_attributes = True
