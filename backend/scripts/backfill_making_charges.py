"""
One-time script: backfill making_charges = 20% of gold value for all Jewellery products,
and recalculate total_price = gold_value + stones_total + new_making_charges.

Run from backend/ directory:
    python scripts/backfill_making_charges.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models.product import Product
from models.product_stone import ProductStone

PURITY_MULTIPLIERS = {
    "24K": 1.0,
    "22K": 22 / 24,
    "18K": 0.7600,
    "14K": 0.6500,
}

def run():
    db = SessionLocal()
    try:
        products = db.query(Product).filter(Product.category == "Jewellery").all()
        print(f"Found {len(products)} Jewellery products")

        updated = 0
        skipped = 0

        for p in products:
            rate = float(p.gold_rate_snapshot or 0)
            if rate == 0:
                print(f"  SKIP {p.name} ({p.id}) — no gold rate snapshot")
                skipped += 1
                continue

            # determine gold weight
            if p.gold_weight:
                gw = float(p.gold_weight)
            else:
                multiplier = PURITY_MULTIPLIERS.get(p.purity or "", 22 / 24)
                gw = float(p.weight) * multiplier

            gold_value = rate * gw
            new_making = round(gold_value * 0.20, 4)

            # stones total
            stones = db.query(ProductStone).filter(ProductStone.product_id == p.id).all()
            stones_total = sum(float(s.total_price or 0) for s in stones)

            new_total = gold_value + stones_total + new_making

            print(f"  {p.name}: making {float(p.making_charges):.2f} → {new_making:.2f}, total {float(p.total_price or 0):.2f} → {new_total:.2f}")

            p.making_charges = new_making
            p.total_price = new_total
            updated += 1

        db.commit()
        print(f"\nDone. Updated: {updated}, Skipped: {skipped}")
    finally:
        db.close()

if __name__ == "__main__":
    run()
