from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.order import Order
from schemas.order import OrderCreate, OrderUpdate, OrderOut
from services.order_service import lock_order
from routers.users import get_current_user, require_manager_or_above
from models.user import User
from typing import List

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.post("/", response_model=OrderOut)
def create_order(
    order_data: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = Order(
        client_id        = order_data.client_id,
        vendor_id        = order_data.vendor_id,
        estimated_weight = order_data.estimated_weight,
        estimated_purity = order_data.estimated_purity,
        estimated_price  = order_data.estimated_price,
        notes            = order_data.notes,
        created_by       = current_user.id
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order

@router.get("/", response_model=List[OrderOut])
def get_all_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Order).all()

@router.get("/{order_id}", response_model=OrderOut)
def get_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.patch("/{order_id}", response_model=OrderOut)
def update_order(
    order_id: str,
    order_data: OrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != "DRAFT":
        raise HTTPException(status_code=400, detail="Only draft orders can be edited")

    if order_data.vendor_id is not None:
        order.vendor_id        = order_data.vendor_id
    if order_data.estimated_weight is not None:
        order.estimated_weight = order_data.estimated_weight
    if order_data.estimated_purity is not None:
        order.estimated_purity = order_data.estimated_purity
    if order_data.estimated_price is not None:
        order.estimated_price  = order_data.estimated_price
    if order_data.final_price is not None:
        order.final_price      = order_data.final_price
    if order_data.notes is not None:
        order.notes            = order_data.notes

    db.commit()
    db.refresh(order)
    return order

@router.post("/{order_id}/lock", response_model=OrderOut)
def lock_order_route(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    try:
        return lock_order(order_id, db, str(current_user.id))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/{order_id}/complete", response_model=OrderOut)
def complete_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != "LOCKED":
        raise HTTPException(status_code=400, detail="Only locked orders can be completed")
    order.status = "COMPLETED"
    db.commit()
    db.refresh(order)
    return order

@router.patch("/{order_id}/cancel", response_model=OrderOut)
def cancel_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status == "LOCKED":
        raise HTTPException(status_code=400, detail="Locked orders cannot be cancelled. Contact owner.")
    order.status = "CANCELLED"
    db.commit()
    db.refresh(order)
    return order
    