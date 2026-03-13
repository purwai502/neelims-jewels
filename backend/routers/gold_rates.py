from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.gold_rate import GoldRate, GoldRateOverride
from schemas.gold_rate import GoldRateCreate, GoldRateOut, GoldRateWithCalculated, GoldRateOverrideCreate, GoldRateOverrideOut
from services.gold_service import get_all_current_rates, get_rate_for_purity
from routers.users import get_current_user, require_manager_or_above
from models.user import User
from datetime import date
from typing import List

router = APIRouter(prefix="/gold-rates", tags=["Gold Rates"])

@router.get("/today", response_model=dict)
def get_today_rates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return get_all_current_rates(db)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/", response_model=GoldRateOut)
def create_gold_rate(
    rate_data: GoldRateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    # check if rate already exists for this date
    existing = db.query(GoldRate)\
        .filter(GoldRate.effective_date == rate_data.effective_date)\
        .first()

    if existing:
        # update existing rate for today
        existing.price_per_gram_24k = rate_data.price_per_gram_24k
        existing.entered_by         = current_user.full_name
        db.commit()
        db.refresh(existing)
        return existing

    # create new rate
    rate = GoldRate(
        price_per_gram_24k = rate_data.price_per_gram_24k,
        effective_date     = rate_data.effective_date,
        entered_by         = current_user.full_name,
        created_by         = current_user.id
    )
    db.add(rate)
    db.commit()
    db.refresh(rate)
    return rate

@router.get("/history", response_model=List[GoldRateOut])
def get_rate_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    return db.query(GoldRate)\
        .order_by(GoldRate.effective_date.desc())\
        .limit(30)\
        .all()

@router.post("/overrides", response_model=GoldRateOverrideOut)
def create_override(
    override_data: GoldRateOverrideCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    # check if override already exists
    existing = db.query(GoldRateOverride)\
        .filter(GoldRateOverride.gold_rate_id == override_data.gold_rate_id)\
        .filter(GoldRateOverride.purity == override_data.purity)\
        .first()

    if existing:
        existing.override_price = override_data.override_price
        existing.reason         = override_data.reason
        db.commit()
        db.refresh(existing)
        return existing

    override = GoldRateOverride(
        gold_rate_id   = override_data.gold_rate_id,
        purity         = override_data.purity,
        override_price = override_data.override_price,
        reason         = override_data.reason
    )
    db.add(override)
    db.commit()
    db.refresh(override)
    return override
    