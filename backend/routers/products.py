from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models.product import Product
from models.product_stone import ProductStone
from schemas.product import ProductCreate, ProductUpdate, ProductOut
from services.gold_service import get_rate_for_purity
from services.barcode_service import generate_barcode
from routers.users import get_current_user, require_manager_or_above
from models.user import User
from typing import List, Optional
from pydantic import BaseModel
import os
import uuid
from fastapi import UploadFile, File

GOLD_PURITIES = {"24K", "22K", "18K", "14K"}

router = APIRouter(prefix="/products", tags=["Products"])

@router.post("/", response_model=ProductOut)
def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    if product_data.purity and product_data.purity.upper() in GOLD_PURITIES:
        try:
            gold_rate_snapshot = get_rate_for_purity(product_data.purity, db)
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    else:
        gold_rate_snapshot = 0

    barcode = generate_barcode(db)

    gold_value   = gold_rate_snapshot * product_data.weight
    stones_total = sum(
        (s.weight or 0) * (s.price_per_carat or 0)
        for s in (product_data.stones or [])
    )
    computed_price = gold_value + stones_total + (product_data.making_charges or 0)
    total_price = product_data.total_price if product_data.total_price is not None else computed_price

    product = Product(
        name               = product_data.name,
        description        = product_data.description,
        weight             = product_data.weight,
        purity             = product_data.purity,
        category           = product_data.category,
        sub_category       = product_data.sub_category,
        making_charges     = product_data.making_charges,
        gold_rate_snapshot = gold_rate_snapshot,
        total_price        = total_price,
        cost_price         = product_data.cost_price,
        vendor_id          = product_data.vendor_id,
        order_id           = product_data.order_id,
        barcode            = barcode,
        created_by         = current_user.id
    )
    db.add(product)
    db.flush()

    for stone_data in (product_data.stones or []):
        computed = (stone_data.weight or 0) * (stone_data.price_per_carat or 0)
        stone = ProductStone(
            product_id      = product.id,
            stone_name      = stone_data.stone_name,
            weight          = stone_data.weight,
            price_per_carat = stone_data.price_per_carat,
            total_price     = stone_data.total_price if stone_data.total_price is not None else computed,
            notes           = stone_data.notes
        )
        db.add(stone)

    db.commit()
    db.refresh(product)
    product.stones = db.query(ProductStone).filter(ProductStone.product_id == product.id).all()
    return product

@router.get("/", response_model=List[ProductOut])
def get_all_products(
    category:     Optional[str] = None,
    sub_category: Optional[str] = None,
    purity:       Optional[str] = None,
    stone:        Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Product)
    if category:     query = query.filter(Product.category == category)
    if sub_category: query = query.filter(Product.sub_category == sub_category)
    if purity:       query = query.filter(Product.purity == purity)
    if stone:
        query = query.join(ProductStone, ProductStone.product_id == Product.id).filter(
            func.lower(ProductStone.stone_name).contains(stone.lower())
        )
    products = query.all()
    for product in products:
        product.stones = db.query(ProductStone).filter(ProductStone.product_id == product.id).all()
    return products

@router.get("/barcode/{barcode}", response_model=ProductOut)
def get_product_by_barcode(
    barcode: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(Product.barcode == barcode).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.stones = db.query(ProductStone).filter(ProductStone.product_id == product.id).all()
    return product

@router.get("/{product_id}", response_model=ProductOut)
def get_product(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.stones = db.query(ProductStone).filter(ProductStone.product_id == product.id).all()
    return product

@router.patch("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: str,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.name           = product_data.name
    product.description    = product_data.description
    product.weight         = product_data.weight
    product.gold_weight    = product_data.gold_weight
    product.purity         = product_data.purity
    product.category       = product_data.category
    product.sub_category   = product_data.sub_category
    product.making_charges = product_data.making_charges
    product.total_price    = product_data.total_price
    product.cost_price     = product_data.cost_price
    product.vendor_id      = product_data.vendor_id
    product.order_id       = product_data.order_id
    product.set_id         = product_data.set_id

    # replace stones
    db.query(ProductStone).filter(ProductStone.product_id == product.id).delete()
    for stone_data in (product_data.stones or []):
        computed = (stone_data.weight or 0) * (stone_data.price_per_carat or 0)
        db.add(ProductStone(
            product_id      = product.id,
            stone_name      = stone_data.stone_name,
            weight          = stone_data.weight,
            price_per_carat = stone_data.price_per_carat,
            total_price     = stone_data.total_price if stone_data.total_price is not None else computed,
            notes           = stone_data.notes,
        ))

    db.commit()
    db.refresh(product)
    product.stones = db.query(ProductStone).filter(ProductStone.product_id == product.id).all()
    return product

@router.post("/{product_id}/image")
async def upload_product_image(
    product_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # create uploads folder if it doesn't exist
    uploads_dir = "uploads/products"
    os.makedirs(uploads_dir, exist_ok=True)

    # save file with unique name
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = f"{uploads_dir}/{filename}"

    with open(filepath, "wb") as f:
        content = await file.read()
        f.write(content)

    # update product
    product.image_path = filepath
    db.commit()

    return { "image_path": filepath }


@router.delete("/{product_id}")
def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    # delete stones first (FK constraint)
    db.query(ProductStone).filter(ProductStone.product_id == product.id).delete()
    db.delete(product)
    db.commit()
    return {"detail": "Product deleted"}


class MarkSoldRequest(BaseModel):
    client_id: Optional[str] = None


@router.patch("/{product_id}/mark-sold", response_model=ProductOut)
def mark_sold(
    product_id: str,
    body: MarkSoldRequest = MarkSoldRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_sold = True
    if body.client_id:
        product.sold_to_client_id = body.client_id
    db.commit()
    db.refresh(product)
    product.stones = db.query(ProductStone).filter(ProductStone.product_id == product.id).all()
    return product