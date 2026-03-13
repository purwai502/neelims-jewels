from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class UserCreate(BaseModel):
    full_name: str
    username: str
    email: Optional[str] = None
    password: str
    role: str

class UserOut(BaseModel):
    id: UUID
    full_name: str
    username: str
    email: Optional[str]
    role: str
    is_active: bool

    class Config:
        from_attributes = True
        