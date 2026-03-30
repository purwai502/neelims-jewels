from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from schemas.user import UserCreate, UserOut
from services.auth_service import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    # login using username
    user = db.query(User).filter(User.username == form_data.username).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    token = create_access_token(data={
        "sub": str(user.id),
        "role": user.role,
        "name": user.full_name
    })

    return {
        "access_token": token,
        "token_type":   "bearer",
        "role":         user.role,
        "name":         user.full_name,
        "username":     user.username
    }

@router.post("/setup", response_model=UserOut)
def setup_owner(user_data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).count()
    if existing > 1:
        raise HTTPException(status_code=403, detail="Setup already complete")

    # check username availability
    existing_username = db.query(User)\
        .filter(User.username == user_data.username)\
        .first()
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")

    hashed = hash_password(user_data.password)
    user = User(
        full_name     = user_data.full_name,
        username      = user_data.username,
        email         = user_data.email,
        password_hash = hashed,
        role          = "OWNER"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
