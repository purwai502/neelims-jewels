from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from schemas.user import UserCreate, UserOut
from services.auth_service import hash_password, decode_access_token
from fastapi.security import OAuth2PasswordBearer
from typing import List

router = APIRouter(prefix="/users", tags=["Users"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def require_owner(current_user: User = Depends(get_current_user)):
    if current_user.role != "OWNER":
        raise HTTPException(status_code=403, detail="Owner access required")
    return current_user

def require_manager_or_above(current_user: User = Depends(get_current_user)):
    if current_user.role not in ["OWNER", "MANAGER"]:
        raise HTTPException(status_code=403, detail="Manager access required")
    return current_user

@router.get("/", response_model=List[UserOut])
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner)
):
    return db.query(User).all()

@router.post("/", response_model=UserOut)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner)
):
    # check username availability
    existing = db.query(User).filter(User.username == user_data.username).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Username '{user_data.username}' is already taken. Try '{user_data.username}233' or similar."
        )

    user = User(
        full_name     = user_data.full_name,
        username      = user_data.username,
        email         = user_data.email,
        password_hash = hash_password(user_data.password),
        role          = user_data.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.patch("/{user_id}/deactivate", response_model=UserOut)
def deactivate_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "OWNER":
        raise HTTPException(status_code=403, detail="Cannot deactivate owner")
    user.is_active = False
    db.commit()
    db.refresh(user)
    return user
