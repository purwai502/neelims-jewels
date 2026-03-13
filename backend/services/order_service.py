from sqlalchemy.orm import Session
from datetime import datetime, timezone
from models.order import Order
from models.transaction import Transaction
from models.account import Account
from models.client import Client
from services.gold_service import get_rate_for_purity

def lock_order(order_id: str, db: Session, locked_by: str) -> Order:
    # fetch the order
    order = db.query(Order).filter(Order.id == order_id).first()

    if not order:
        raise Exception("Order not found")

    if order.status != "DRAFT":
        raise Exception("Only draft orders can be locked")

    if not order.final_price:
        raise Exception("Final price must be set before locking")

    # get business operating account
    business_account = db.query(Account)\
        .filter(Account.account_type == "BUSINESS")\
        .filter(Account.name == "Studio Account")\
        .first()

    if not business_account:
        raise Exception("Business account not found")

    # freeze the gold rate at this moment
    gold_rate_snapshot = None
    if order.estimated_purity:
        gold_rate_snapshot = get_rate_for_purity(order.estimated_purity, db)

    # determine if this is a client order or a stock order
    if order.client_id:
        # CLIENT ORDER — debit client, credit business
        client = db.query(Client).filter(Client.id == order.client_id).first()
        if not client:
            raise Exception("Client not found")
        debit_account  = client.account_id
        credit_account = business_account.id
        notes = f"Client order locked: {order.id}"
    else:
        # STOCK ORDER — debit operating account, credit inventory account
        inventory_account = db.query(Account)\
            .filter(Account.account_type == "BUSINESS")\
            .filter(Account.name == "Studio Inventory")\
            .first()
        if not inventory_account:
            raise Exception("Inventory account not found")
        debit_account  = business_account.id
        credit_account = inventory_account.id
        notes = f"Stock order locked: {order.id}"

    # create the transaction
    transaction = Transaction(
        debit_account_id   = debit_account,
        credit_account_id  = credit_account,
        amount             = order.final_price,
        gold_weight        = order.estimated_weight,
        gold_purity        = order.estimated_purity,
        gold_rate_snapshot = gold_rate_snapshot,
        reference_type     = "ORDER",
        reference_id       = order.id,
        created_by         = locked_by,
        notes              = notes
    )

    # lock the order
    order.status    = "LOCKED"
    order.locked_at = datetime.now(timezone.utc)

    db.add(transaction)
    db.commit()
    db.refresh(order)

    return order
    