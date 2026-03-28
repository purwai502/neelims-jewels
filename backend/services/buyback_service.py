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

    # look up original buyer if stored
    original_buyer = None
    if product.sold_to_client_id:
        original_buyer = db.query(Client).filter(Client.id == product.sold_to_client_id).first()

    return {
        "product_id":           product_id,
        "product_name":         product.name,
        "barcode":              product.barcode,
        "weight":               float(product.weight),
        "purity":               product.purity,
        "original_price":       float(product.total_price) if product.total_price else 0,
        "deduction_20_pct":     round(float(product.total_price or 0) * 0.2, 2),
        "buyback_base":         round(float(product.total_price or 0) * 0.8, 2),
        "original_gold_rate":   float(product.gold_rate_snapshot),
        "current_gold_rate":    current_rate,
        "original_gold_value":  original_gold_value,
        "current_gold_value":   current_gold_value,
        "gold_variance":        gold_variance,
        "buyback_value":        round(buyback_value, 2),
        "client_id":            str(original_buyer.id) if original_buyer else None,
        "client_name":          original_buyer.full_name if original_buyer else None,
    }


def process_buyback(product_id: str, client_id: str, db: Session, processed_by: str) -> Transaction:
    # calculate the buyback value
    calculation = calculate_buyback_value(product_id, db)

    # get client account
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise Exception("Client not found")

    # get business account (auto-create if missing)
    business_account = db.query(Account)\
        .filter(Account.account_type == "BUSINESS")\
        .filter(Account.name == "Studio Account")\
        .first()
    if not business_account:
        business_account = Account(name="Studio Account", account_type="BUSINESS")
        db.add(business_account)
        db.flush()

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

    # mark product as no longer sold — it's been returned
    product.is_sold = False

    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    return transaction
    
