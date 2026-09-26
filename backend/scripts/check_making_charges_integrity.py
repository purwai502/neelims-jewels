"""
Read-only audit: find unsold Jewellery products whose making_charges implies
a different gold rate than the one actually frozen in that product's own
gold_rate_snapshot.

Why this check exists: the Edit Product page used to auto-recalculate
making_charges as a % of *today's* gold value the moment the page loaded,
even if nothing was actually changed, silently overwriting the real,
originally-fixed labour charge if you then saved. That bug is fixed (the
auto-calc no longer fires until you actually edit something), but this
script stays useful as a spot-check: since gold_rate_snapshot is never
touched by editing a product, any row where "making_charges / (pct * gold
weight)" doesn't match its own gold_rate_snapshot means something computed
that labour charge using a rate other than the one on record for this
piece — worth a manual look, whatever the cause turns out to be.

This script only reports. It never writes anything.

Run from the backend/ directory:
    python scripts/check_making_charges_integrity.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models.product import Product
from models.product_stone import ProductStone

GOLD_PURITIES = {"24K", "22K", "18K", "14K"}
RATE_GAP_THRESHOLD = 50  # rupees/gram — flag anything beyond normal rounding


def run():
    db = SessionLocal()
    try:
        products = db.query(Product).filter(
            Product.is_sold == False,  # noqa: E712
            Product.category == "Jewellery",
        ).all()

        flagged = []
        for p in products:
            if not p.gold_weight or float(p.gold_weight) <= 0:
                continue
            if not p.purity or p.purity.upper() not in GOLD_PURITIES:
                continue
            if not p.making_charges or float(p.making_charges) <= 0:
                continue
            if not p.gold_rate_snapshot:
                continue

            pct = 0.30 if p.sub_category == "Gold" else 0.20
            gold_weight = float(p.gold_weight)
            implied_rate = float(p.making_charges) / (pct * gold_weight)
            stored_rate = float(p.gold_rate_snapshot)
            gap = implied_rate - stored_rate

            if abs(gap) > RATE_GAP_THRESHOLD:
                stones = db.query(ProductStone).filter(ProductStone.product_id == p.id).all()
                stones_total = sum(float(s.total_price or 0) for s in stones)
                correct_making = round(gold_weight * stored_rate * pct, 2)
                correct_total = round(gold_weight * stored_rate + stones_total + correct_making, 2)
                flagged.append({
                    "barcode": p.barcode, "name": p.name,
                    "stored_making": float(p.making_charges), "correct_making": correct_making,
                    "stored_total": float(p.total_price or 0), "correct_total": correct_total,
                    "implied_rate": round(implied_rate, 2), "stored_rate": stored_rate,
                })

        if not flagged:
            print("Clean — no products found with a mismatched making-charges rate.")
            return

        print(f"Found {len(flagged)} product(s) with a mismatch:\n")
        for f in flagged:
            print(f"  {f['barcode']}  {f['name']}")
            print(f"    implied rate ₹{f['implied_rate']} vs frozen rate ₹{f['stored_rate']}")
            print(f"    making_charges: ₹{f['stored_making']:.2f} → should be ₹{f['correct_making']:.2f}")
            print(f"    total_price:    ₹{f['stored_total']:.2f} → should be ₹{f['correct_total']:.2f}\n")
        print("This script only reports — nothing was changed. Fix manually or ask for a correction.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
