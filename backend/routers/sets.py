from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.product_set import ProductSet
from models.product import Product
from schemas.product_set import ProductSetCreate, ProductSetOut
from routers.users import get_current_user, require_manager_or_above
from models.user import User
from typing import List
from uuid import UUID

router = APIRouter(prefix="/sets", tags=["Sets"])


@router.get("/", response_model=List[ProductSetOut])
def list_sets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(ProductSet).order_by(ProductSet.name).all()


@router.post("/", response_model=ProductSetOut)
def create_set(
    data: ProductSetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    existing = db.query(ProductSet).filter(ProductSet.name == data.name).first()
    if existing:
        return existing
    s = ProductSet(name=data.name)
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/{set_id}")
def delete_set(
    set_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    s = db.query(ProductSet).filter(ProductSet.id == set_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Set not found")
    # unlink all products from this set
    db.query(Product).filter(Product.set_id == set_id).update({"set_id": None})
    db.delete(s)
    db.commit()
    return {"detail": "Set deleted"}
