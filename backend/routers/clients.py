from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.client import Client
from models.account import Account
from schemas.client import ClientCreate, ClientOut
from routers.users import get_current_user, require_manager_or_above
from models.user import User
from typing import List
from sqlalchemy import text

router = APIRouter(prefix="/clients", tags=["Clients"])

@router.post("/", response_model=ClientOut)
def create_client(
    client_data: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # create account for client first
    account = Account(
        name         = client_data.full_name,
        account_type = "CLIENT",
        created_by   = current_user.id
    )
    db.add(account)
    db.flush()  # gets the account id without committing

    # create client linked to that account
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
    current_user: User = Depends(require_manager_or_above)
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    result = db.execute(
        text(f"SELECT balance FROM account_balances WHERE account_id = '{client.account_id}'")
    ).fetchone()

    return {
        "client_id":   client_id,
        "client_name": client.full_name,
        "balance":     float(result[0]) if result else 0.0
    }