from sqlalchemy.orm import Session
from datetime import date
from models.gold_rate import GoldRate, GoldRateOverride

PURITY_MULTIPLIERS = {
    "24K": 1.0,
    "22K": 22/24,
    "18K": 0.7600,
    "14K": 0.6500,
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
