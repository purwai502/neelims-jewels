from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models.account import Account
from routers.users import get_current_user, require_manager_or_above
from models.user import User
from typing import List

router = APIRouter(prefix="/accounts", tags=["Accounts"])

@router.get("/")
def get_all_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    accounts = db.query(Account).all()
    return [
        {
            "id":           str(a.id),
            "name":         a.name,
            "account_type": a.account_type,
        }
        for a in accounts
    ]
