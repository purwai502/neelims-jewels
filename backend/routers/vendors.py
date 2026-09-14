from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.vendor import Vendor
from models.account import Account
from models.product import Product
from models.product_stone import ProductStone
from schemas.vendor import VendorCreate, VendorOut
from routers.users import get_current_user, require_manager_or_above
from models.user import User
from services.gold_service import apply_live_valuation
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
        gst_number     = vendor_data.gst_number,
        tin_number     = vendor_data.tin_number,
        pan_number     = vendor_data.pan_number,
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
    vendor.gst_number     = vendor_data.gst_number
    vendor.tin_number     = vendor_data.tin_number
    vendor.pan_number     = vendor_data.pan_number

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

    # Items still on approval (not yet purchased or sold) aren't owned stock
    # yet, so they don't count toward what's owed to the vendor.
    total_goods_received = db.execute(text("""
        SELECT COALESCE(SUM(cost_price), 0)
        FROM products
        WHERE vendor_id = :vendor_id AND cost_price IS NOT NULL
          AND NOT (acquisition_type = 'ON_APPROVAL' AND approval_status = 'PENDING')
    """), {"vendor_id": vendor_id}).scalar()

    total_paid = db.execute(text("""
        SELECT COALESCE(SUM(amount), 0)
        FROM payments
        WHERE account_id = :aid
    """), {"aid": str(vendor.account_id)}).scalar()

    balance_due = float(total_goods_received) - float(total_paid)

    return {
        "vendor_id":            vendor_id,
        "vendor_name":          vendor.business_name,
        "total_goods_received": float(total_goods_received),
        "total_paid":           float(total_paid),
        "balance_due":          balance_due,
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

    # Loaded via the ORM so unsold products can be marked to market with
    # today's gold rate (same rule as everywhere else). cost_price — what
    # was paid to the vendor — is a historical fact and is never touched by
    # this, whether the product is sold or not.
    products = db.query(Product).filter(Product.vendor_id == vendor_id).order_by(Product.created_at.desc()).all()
    stones_by_product: dict = {}
    for s in db.query(ProductStone).filter(ProductStone.product_id.in_([p.id for p in products])).all():
        stones_by_product.setdefault(str(s.product_id), []).append(s)

    result = []
    for product in products:
        product.stones = stones_by_product.get(str(product.id), [])
        apply_live_valuation(product, db)
        result.append({
            "id":                str(product.id),
            "barcode":           product.barcode,
            "name":              product.name,
            "description":       product.description,
            "weight":            float(product.weight) if product.weight is not None else None,
            "purity":            product.purity,
            "cost_price":        float(product.cost_price) if product.cost_price is not None else None,
            "total_price":       float(product.total_price) if product.total_price is not None else None,
            "is_sold":           product.is_sold,
            "created_at":        product.created_at,
            "acquisition_type":  product.acquisition_type,
            "approval_status":   product.approval_status,
            "approval_due_date": product.approval_due_date,
        })
    return result
