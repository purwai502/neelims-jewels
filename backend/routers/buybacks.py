from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.transaction import Transaction
from schemas.transaction import TransactionOut
from services.buyback_service import calculate_buyback_value, process_buyback
from routers.users import get_current_user, require_manager_or_above
from models.user import User

router = APIRouter(prefix="/buybacks", tags=["Buybacks"])

@router.get("/calculate/{product_id}")
def get_buyback_calculation(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return calculate_buyback_value(product_id, db)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/process/{product_id}/{client_id}", response_model=TransactionOut)
def process_buyback_route(
    product_id: str,
    client_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    try:
        return process_buyback(
            product_id   = product_id,
            client_id    = client_id,
            db           = db,
            processed_by = str(current_user.id)
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
        