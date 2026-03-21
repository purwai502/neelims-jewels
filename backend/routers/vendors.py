from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.vendor import Vendor
from models.account import Account
from schemas.vendor import VendorCreate, VendorOut
from routers.users import get_current_user, require_manager_or_above
from models.user import User
from typing import List

router = APIRouter(prefix="/vendors", tags=["Vendors"])

@router.post("/", response_model=VendorOut)
def create_vendor(
    vendor_data: VendorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    # create account for vendor first
    account = Account(
        name         = vendor_data.business_name,
        account_type = "VENDOR",
        created_by   = current_user.id
    )
    db.add(account)
    db.flush()

    # create vendor linked to that account
    vendor = Vendor(
        account_id     = account.id,
        business_name  = vendor_data.business_name,
        contact_person = vendor_data.contact_person,
        phone          = vendor_data.phone,
        email          = vendor_data.email,
        address        = vendor_data.address,
        notes          = vendor_data.notes,
        created_by     = current_user.id
    )
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return vendor

@router.get("/", response_model=List[VendorOut])
def get_all_vendors(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Vendor).all()

@router.get("/{vendor_id}", response_model=VendorOut)
def get_vendor(
    vendor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor

@router.patch("/{vendor_id}", response_model=VendorOut)
def update_vendor(
    vendor_id: str,
    vendor_data: VendorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    vendor.business_name  = vendor_data.business_name
    vendor.contact_person = vendor_data.contact_person
    vendor.phone          = vendor_data.phone
    vendor.email          = vendor_data.email
    vendor.address        = vendor_data.address
    vendor.notes          = vendor_data.notes

    db.commit()
    db.refresh(vendor)
    return vendor

@router.get("/{vendor_id}/balance")
def get_vendor_balance(
    vendor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    from sqlalchemy import text
    row = db.execute(text("""
        SELECT
            COALESCE(SUM(pr.cost_price), 0)::float                       AS total_goods_received,
            COALESCE(ab.balance, 0)::float                               AS total_paid,
            (COALESCE(SUM(pr.cost_price), 0) - COALESCE(ab.balance, 0))::float AS balance_due
        FROM vendors v
        LEFT JOIN products pr ON pr.vendor_id = v.id AND pr.cost_price IS NOT NULL
        LEFT JOIN account_balances ab ON ab.account_id = v.account_id
        WHERE v.id = :vendor_id
        GROUP BY ab.balance
    """), {"vendor_id": vendor_id}).fetchone()

    return {
        "vendor_id":            vendor_id,
        "vendor_name":          vendor.business_name,
        "total_goods_received": float(row[0]) if row else 0.0,
        "total_paid":           float(row[1]) if row else 0.0,
        "balance_due":          float(row[2]) if row else 0.0,
    }


@router.get("/{vendor_id}/products")
def get_vendor_products(
    vendor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    from sqlalchemy import text
    rows = db.execute(text("""
        SELECT
            p.id, p.barcode, p.name, p.description,
            p.weight::float, p.purity,
            p.cost_price::float,
            p.total_price::float,
            p.is_sold,
            p.created_at
        FROM products p
        WHERE p.vendor_id = :vendor_id
        ORDER BY p.created_at DESC
    """), {"vendor_id": vendor_id}).fetchall()

    return [dict(r._mapping) for r in rows]
