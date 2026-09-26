from sqlalchemy.orm import Session
from datetime import date
from models.gold_rate import GoldRate, GoldRateOverride
from models.product import Product

PURITY_MULTIPLIERS = {
    "24K": 1.0,
    "22K": 0.92,
    "18K": 0.7600,
    "14K": 0.6500,
}

GOLD_PURITIES = set(PURITY_MULTIPLIERS.keys())

# Metallurgical fine-gold fraction of an alloy's gross weight (e.g. a 14K
# piece is 14/24 actual gold by weight) — a completely different concept
# from PURITY_MULTIPLIERS above, which is a business rate markup applied to
# the 24K market rate. Used only to estimate gold_weight when a product
# doesn't have one recorded explicitly. Matches the same table already used
# frontend-side (PURITY_MULTIPLIER in products/[id]/page.tsx) for this exact
# estimate — the two must agree, or the displayed Costing and the backend's
# Final Price silently diverge.
GOLD_CONTENT_FRACTION = {
    "24K": 1.0,
    "22K": 0.9167,
    "18K": 0.75,
    "14K": 0.5833,
}

def get_current_base_rate(db: Session) -> GoldRate:
    return db.query(GoldRate)\
        .filter(GoldRate.effective_date <= date.today())\
        .order_by(GoldRate.effective_date.desc())\
        .first()

def get_rate_for_purity(purity: str, db: Session) -> float:
    base = get_current_base_rate(db)

    if not base:
        raise Exception("No gold rate has been entered yet")

    # check for manual override first
    override = db.query(GoldRateOverride)\
        .filter(GoldRateOverride.gold_rate_id == base.id)\
        .filter(GoldRateOverride.purity == purity)\
        .first()

    if override:
        return float(override.override_price)

    # fall back to formula
    multiplier = PURITY_MULTIPLIERS.get(purity)
    if not multiplier:
        raise Exception(f"Unknown purity: {purity}")

    return round(float(base.price_per_gram_24k) * multiplier, 4)

JEWELLERY_MAKING_PCT_GOLD_SUBCATEGORY = 0.30  # sub_category == "Gold"
JEWELLERY_MAKING_PCT_DEFAULT = 0.20            # any other Jewellery sub_category


def apply_live_valuation(product: Product, db: Session) -> Product:
    """Mark unsold gold products to market: override the displayed gold rate,
    making charges, and total price with today's rate instead of the ones
    frozen at creation. Making charges are a percentage-of-gold-value pricing
    policy (30% for the "Gold" sub-category, 20% for other Jewellery), not a
    fixed labour cost, so they're meant to float with the daily rate for as
    long as a piece is unsold, exactly like the gold value itself — both
    numbers should keep climbing (or falling) with the market for as long as
    the piece sits in stock. Sold products, the vendor purchase cost
    (cost_price — never touched here), and non-gold products (no live rate to
    track) are left untouched. This mutates the in-memory object only —
    callers that want it persisted (e.g. at the moment of sale) must still
    call db.commit()."""
    if product.is_sold:
        return product
    if not (product.purity and product.purity.upper() in GOLD_PURITIES):
        return product
    try:
        live_rate = get_rate_for_purity(product.purity, db)
    except Exception:
        return product  # no gold rate entered yet — keep the stored snapshot

    if product.gold_weight is not None:
        net_gold_weight = float(product.gold_weight)
    else:
        fraction = GOLD_CONTENT_FRACTION.get(product.purity.upper(), 1.0)
        net_gold_weight = float(product.weight) * fraction
    stones_total = sum(float(s.total_price or 0) for s in (product.stones or []))
    gold_value = live_rate * net_gold_weight

    making_charges = float(product.making_charges or 0)
    if product.category == "Jewellery":
        pct = JEWELLERY_MAKING_PCT_GOLD_SUBCATEGORY if product.sub_category == "Gold" else JEWELLERY_MAKING_PCT_DEFAULT
        making_charges = round(gold_value * pct, 4)
        product.making_charges = making_charges

    product.gold_rate_snapshot = live_rate
    product.total_price = gold_value + stones_total + making_charges
    return product


def get_all_current_rates(db: Session) -> dict:
    base = get_current_base_rate(db)

    if not base:
        raise Exception("No gold rate has been entered yet")

    return {
        "effective_date": base.effective_date,
        "24K": get_rate_for_purity("24K", db),
        "22K": get_rate_for_purity("22K", db),
        "18K": get_rate_for_purity("18K", db),
        "14K": get_rate_for_purity("14K", db),
    }
