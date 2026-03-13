from sqlalchemy.orm import Session
from models.transaction import Transaction
from models.product import Product
from models.account import Account
from models.client import Client
from services.gold_service import get_rate_for_purity

def calculate_buyback_value(product_id: str, db: Session) -> dict:
    # fetch the product
    product = db.query(Product).filter(Product.id == product_id).first()

    if not product:
        raise Exception("Product not found")

    if not product.gold_rate_snapshot:
        raise Exception("Product has no gold rate snapshot")

    # original gold value when piece was created
    original_gold_value = float(product.gold_rate_snapshot) * float(product.weight)

    # current gold value using today's rate
    current_rate = get_rate_for_purity(product.purity, db)
    current_gold_value = current_rate * float(product.weight)

    # gold variance — difference between then and now
    gold_variance = current_gold_value - original_gold_value

    # buyback formula: 80% of original value + gold variance
    original_piece_value = original_gold_value
    buyback_value = (original_piece_value * 0.8) + gold_variance

    return {
        "product_id":           product_id,
        "product_name":         product.name,
        "weight":               float(product.weight),
        "purity":               product.purity,
        "original_gold_rate":   float(product.gold_rate_snapshot),
        "current_gold_rate":    current_rate,
        "original_gold_value":  original_gold_value,
        "current_gold_value":   current_gold_value,
        "gold_variance":        gold_variance,
        "buyback_value":        round(buyback_value, 2)
    }


def process_buyback(product_id: str, client_id: str, db: Session, processed_by: str) -> Transaction:
    # calculate the buyback value
    calculation = calculate_buyback_value(product_id, db)

    # get client account
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise Exception("Client not found")

    # get business account
    business_account = db.query(Account)\
        .filter(Account.account_type == "BUSINESS")\
        .filter(Account.name == "Studio Account")\
        .first()
    if not business_account:
        raise Exception("Business account not found")

    # get the product
    product = db.query(Product).filter(Product.id == product_id).first()

    # create buyback transaction
    # business pays client — so business is debited, client is credited
    transaction = Transaction(
        debit_account_id   = business_account.id,
        credit_account_id  = client.account_id,
        amount             = calculation["buyback_value"],
        gold_weight        = calculation["weight"],
        gold_purity        = calculation["purity"],
        gold_rate_snapshot = calculation["current_gold_rate"],
        reference_type     = "BUYBACK",
        reference_id       = product.id,
        created_by         = processed_by,
        notes              = f"Buyback for {calculation['product_name']}. Original rate: {calculation['original_gold_rate']}. Current rate: {calculation['current_gold_rate']}. Gold variance: {calculation['gold_variance']}"
    )

    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    return transaction
    
