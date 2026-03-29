from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.payment import Payment
from models.transaction import Transaction
from models.account import Account
from models.order import Order
from schemas.payment import PaymentCreate, PaymentOut
from routers.users import get_current_user, require_manager_or_above
from models.user import User
from typing import List

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.post("/", response_model=PaymentOut)
def create_payment(
    payment_data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    valid_methods = ["CASH", "BANK", "UPI", "CHEQUE", "GOLD_EXCHANGE"]
    if payment_data.payment_method not in valid_methods:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid payment method. Must be one of: {valid_methods}"
        )

    account = db.query(Account).filter(Account.id == payment_data.account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    business_account = db.query(Account)\
        .filter(Account.account_type == "BUSINESS")\
        .filter(Account.name == "Studio Account")\
        .first()
    if not business_account:
        raise HTTPException(status_code=404, detail="Business account not found")

    if payment_data.payment_method == "GOLD_EXCHANGE":
        weight_type = "Expected" if payment_data.is_estimated else "Final"
        notes = f"Gold Exchange — {payment_data.gold_description or 'Old gold'} · {payment_data.gold_weight}g · {payment_data.gold_purity} · {weight_type} weight"
    else:
        notes = payment_data.notes or f"Payment via {payment_data.payment_method}"

    transaction = Transaction(
        debit_account_id  = payment_data.account_id,
        credit_account_id = business_account.id,
        amount            = payment_data.amount,
        reference_type    = "PAYMENT",
        reference_id      = payment_data.order_id,
        notes             = notes,
        created_by        = current_user.id
    )
    db.add(transaction)
    db.flush()

    payment = Payment(
        account_id     = payment_data.account_id,
        order_id       = payment_data.order_id,
        amount         = payment_data.amount,
        payment_method = payment_data.payment_method,
        transaction_id = transaction.id,
        notes          = notes,
        created_by     = current_user.id
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment

@router.patch("/{payment_id}")
def update_payment(
    payment_id: str,
    update_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    if "amount" in update_data:
        payment.amount = update_data["amount"]
    if "notes" in update_data:
        payment.notes = update_data["notes"]
    if "payment_method" in update_data:
        valid_methods = ["CASH", "BANK", "UPI", "CHEQUE"]
        if update_data["payment_method"] not in valid_methods:
            raise HTTPException(status_code=400, detail=f"Invalid method. Use: {valid_methods}")
        payment.payment_method = update_data["payment_method"]

    if payment.transaction_id:
        transaction = db.query(Transaction)\
            .filter(Transaction.id == payment.transaction_id)\
            .first()
        if transaction:
            if "amount" in update_data:
                transaction.amount = update_data["amount"]
            if "notes" in update_data:
                transaction.notes = update_data["notes"]

    db.commit()
    db.refresh(payment)
    return payment


@router.delete("/{payment_id}")
def delete_payment(
    payment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    # also delete the linked transaction
    if payment.transaction_id:
        transaction = db.query(Transaction)\
            .filter(Transaction.id == payment.transaction_id)\
            .first()
        if transaction:
            db.delete(transaction)

    db.delete(payment)
    db.commit()
    return {"detail": "Payment deleted"}

@router.get("/", response_model=List[PaymentOut])
def get_all_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    return db.query(Payment).order_by(Payment.created_at.desc()).all()

@router.get("/order/{order_id}", response_model=List[PaymentOut])
def get_order_payments(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Payment).filter(Payment.order_id == order_id).all()

@router.get("/order/{order_id}/summary")
def get_order_payment_summary(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    payments = db.query(Payment).filter(Payment.order_id == order_id).all()
    total_paid = sum(float(p.amount) for p in payments)
    final_price = float(order.final_price) if order.final_price else 0.0
    outstanding = final_price - total_paid

    return {
        "order_id":    order_id,
        "final_price": final_price,
        "total_paid":  total_paid,
        "outstanding": outstanding,
        "payments":    payments
    }