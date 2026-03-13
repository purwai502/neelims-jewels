from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.transaction import Transaction
from schemas.transaction import TransactionCreate, TransactionOut
from services.gold_service import get_rate_for_purity
from routers.users import get_current_user, require_manager_or_above
from models.user import User
from typing import List

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.get("/", response_model=List[TransactionOut])
def get_all_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    return db.query(Transaction)\
        .order_by(Transaction.date.desc())\
        .all()

@router.get("/{transaction_id}", response_model=TransactionOut)
def get_transaction(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    transaction = db.query(Transaction)\
        .filter(Transaction.id == transaction_id)\
        .first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction

@router.post("/manual", response_model=TransactionOut)
def create_manual_transaction(
    transaction_data: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    # validate accounts are different
    if transaction_data.debit_account_id == transaction_data.credit_account_id:
        raise HTTPException(status_code=400, detail="Debit and credit accounts must be different")

    # freeze gold rate if gold is involved
    gold_rate_snapshot = None
    if transaction_data.gold_purity and transaction_data.gold_weight:
        try:
            gold_rate_snapshot = get_rate_for_purity(transaction_data.gold_purity, db)
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    transaction = Transaction(
        debit_account_id       = transaction_data.debit_account_id,
        credit_account_id      = transaction_data.credit_account_id,
        amount                 = transaction_data.amount,
        gold_weight            = transaction_data.gold_weight,
        gold_purity            = transaction_data.gold_purity,
        gold_rate_snapshot     = gold_rate_snapshot,
        reference_type         = "MANUAL",
        reference_id           = transaction_data.reference_id,
        related_transaction_id = transaction_data.related_transaction_id,
        notes                  = transaction_data.notes,
        created_by             = current_user.id
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction

@router.get("/account/{account_id}", response_model=List[TransactionOut])
def get_account_transactions(
    account_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    transactions = db.query(Transaction).filter(
        (Transaction.debit_account_id == account_id) |
        (Transaction.credit_account_id == account_id)
    ).order_by(Transaction.date.desc()).all()
    return transactions
    