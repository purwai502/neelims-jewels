from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.transaction import Transaction
from models.product import Product
from models.client import Client
from schemas.transaction import TransactionOut
from services.buyback_service import calculate_buyback_value, process_buyback
from routers.users import get_current_user, require_manager_or_above
from models.user import User

router = APIRouter(prefix="/buybacks", tags=["Buybacks"])


def _serialize_buyback(t: Transaction, db: Session) -> dict:
    product = db.query(Product).filter(Product.id == t.reference_id).first() if t.reference_id else None
    client  = db.query(Client).filter(Client.account_id == t.credit_account_id).first()
    return {
        "transaction_id":     str(t.id),
        "date":               t.date.isoformat() if t.date else None,
        "amount":             float(t.amount) if t.amount is not None else None,
        "gold_weight":        float(t.gold_weight) if t.gold_weight is not None else None,
        "gold_purity":        t.gold_purity,
        "gold_rate_snapshot": float(t.gold_rate_snapshot) if t.gold_rate_snapshot is not None else None,
        "notes":              t.notes,
        "product": {
            "id":                 str(product.id),
            "name":               product.name,
            "barcode":            product.barcode,
            "weight":             float(product.weight),
            "purity":             product.purity,
            "total_price":        float(product.total_price) if product.total_price is not None else None,
            "gold_rate_snapshot": float(product.gold_rate_snapshot) if product.gold_rate_snapshot is not None else None,
        } if product else None,
        "client": {
            "id":        str(client.id),
            "full_name": client.full_name,
            "phone":     client.phone,
        } if client else None,
    }


@router.get("/")
def list_buybacks(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    rows = db.query(Transaction)\
        .filter(Transaction.reference_type == "BUYBACK")\
        .order_by(Transaction.date.desc())\
        .all()
    return [_serialize_buyback(t, db) for t in rows]


@router.get("/product/{product_id}")
def list_buybacks_for_product(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    rows = db.query(Transaction)\
        .filter(Transaction.reference_type == "BUYBACK")\
        .filter(Transaction.reference_id == product_id)\
        .order_by(Transaction.date.desc())\
        .all()
    return [_serialize_buyback(t, db) for t in rows]


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
        