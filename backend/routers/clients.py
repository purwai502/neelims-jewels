from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.client import Client
from models.account import Account
from models.transaction import Transaction
from models.payment import Payment
from schemas.client import ClientCreate, ClientOut
from routers.users import get_current_user, require_manager_or_above
from models.user import User
from typing import List
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/clients", tags=["Clients"])

class ClientPayRequest(BaseModel):
    amount: float
    payment_method: str  # CASH, BANK, UPI, CHEQUE
    notes: Optional[str] = None

@router.post("/", response_model=ClientOut)
def create_client(
    client_data: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    account = Account(
        name         = client_data.full_name,
        account_type = "CLIENT",
        created_by   = current_user.id
    )
    db.add(account)
    db.flush()

    client = Client(
        account_id = account.id,
        full_name  = client_data.full_name,
        phone      = client_data.phone,
        email      = client_data.email,
        address    = client_data.address,
        notes      = client_data.notes,
        created_by = current_user.id
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return client

@router.get("/", response_model=List[ClientOut])
def get_all_clients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Client).all()

@router.get("/{client_id}", response_model=ClientOut)
def get_client(
    client_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@router.patch("/{client_id}", response_model=ClientOut)
def update_client(
    client_id: str,
    client_data: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    client.full_name = client_data.full_name
    client.phone     = client_data.phone
    client.email     = client_data.email
    client.address   = client_data.address
    client.notes     = client_data.notes

    db.commit()
    db.refresh(client)
    return client

@router.get("/{client_id}/balance")
def get_client_balance(
    client_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    total_billed = db.execute(text("""
        SELECT COALESCE(SUM(total_price), 0)
        FROM products
        WHERE sold_to_client_id = :cid AND is_sold = true
    """), {"cid": client_id}).scalar()

    total_paid = db.execute(text("""
        SELECT COALESCE(SUM(amount), 0)
        FROM payments
        WHERE account_id = :aid
    """), {"aid": str(client.account_id)}).scalar()

    balance_due = float(total_billed) - float(total_paid)

    return {
        "client_id":    client_id,
        "client_name":  client.full_name,
        "total_billed": float(total_billed),
        "total_paid":   float(total_paid),
        "balance_due":  balance_due,
    }

@router.get("/{client_id}/sold-products")
def get_client_sold_products(
    client_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    rows = db.execute(text("""
        SELECT id, barcode, name, total_price, created_at
        FROM products
        WHERE sold_to_client_id = :cid AND is_sold = true
        ORDER BY created_at DESC
    """), {"cid": client_id}).fetchall()

    return [dict(r._mapping) for r in rows]

@router.get("/{client_id}/payments")
def get_client_payments(
    client_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    rows = db.execute(text("""
        SELECT id, amount, payment_method, notes, created_at
        FROM payments
        WHERE account_id = :aid
        ORDER BY created_at DESC
    """), {"aid": str(client.account_id)}).fetchall()

    return [dict(r._mapping) for r in rows]

@router.post("/{client_id}/pay")
def record_client_payment(
    client_id: str,
    body: ClientPayRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    valid_methods = ["CASH", "BANK", "UPI", "CHEQUE"]
    if body.payment_method not in valid_methods:
        raise HTTPException(status_code=400, detail=f"Invalid method. Use: {valid_methods}")

    business_account = db.query(Account)\
        .filter(Account.account_type == "BUSINESS")\
        .filter(Account.name == "Studio Account")\
        .first()
    if not business_account:
        # create it if missing
        business_account = Account(name="Studio Account", account_type="BUSINESS")
        db.add(business_account)
        db.flush()

    transaction = Transaction(
        debit_account_id  = client.account_id,
        credit_account_id = business_account.id,
        amount            = body.amount,
        reference_type    = "PAYMENT",
        notes             = body.notes or f"Payment via {body.payment_method}",
        created_by        = current_user.id
    )
    db.add(transaction)
    db.flush()

    payment = Payment(
        account_id     = client.account_id,
        amount         = body.amount,
        payment_method = body.payment_method,
        transaction_id = transaction.id,
        notes          = body.notes or f"Payment via {body.payment_method}",
        created_by     = current_user.id
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    return {"detail": "Payment recorded", "payment_id": str(payment.id), "amount": body.amount}
