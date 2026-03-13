from sqlalchemy.orm import Session
from models.product import Product

def generate_barcode(db: Session) -> str:
    # count existing products and generate next number
    count = db.query(Product).count()
    next_number = count + 1
    barcode = f"NJ-{next_number:06d}"
    
    # make sure it doesn't already exist
    existing = db.query(Product)\
        .filter(Product.barcode == barcode)\
        .first()
    
    if existing:
        # if collision, keep incrementing
        while existing:
            next_number += 1
            barcode = f"NJ-{next_number:06d}"
            existing = db.query(Product)\
                .filter(Product.barcode == barcode)\
                .first()
    
    return barcode
    