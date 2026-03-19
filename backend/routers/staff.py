from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from models.user import User
from models.staff_profile import StaffProfile
from models.staff_attendance import StaffAttendance
from models.salary_payment import SalaryPayment
from models.salary_advance import SalaryAdvance
from models.karigar_payment import KarigarPayment
from routers.users import get_current_user, require_manager_or_above, require_owner
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
import calendar
import uuid

router = APIRouter(prefix="/staff", tags=["Staff"])


# ── Schemas ───────────────────────────────────────────────

class StaffCreate(BaseModel):
    full_name:      str
    phone:          Optional[str] = None
    email:          Optional[str] = None
    address:        Optional[str] = None
    join_date:      Optional[str] = None
    staff_type:     str = "EMPLOYEE"        # EMPLOYEE / KARIGAR / CONTRACTOR
    monthly_salary: Optional[float] = 0
    day_rate:       Optional[float] = None
    salary_type:    str = "MONTHLY"
    contract_type:  str = "FULL_TIME"
    notes:          Optional[str] = None
    user_id:        Optional[str] = None    # Owner only — link to existing user account

class StaffUpdate(BaseModel):
    full_name:      Optional[str] = None
    phone:          Optional[str] = None
    email:          Optional[str] = None
    address:        Optional[str] = None
    join_date:      Optional[str] = None
    staff_type:     Optional[str] = None
    monthly_salary: Optional[float] = None
    day_rate:       Optional[float] = None
    salary_type:    Optional[str] = None
    contract_type:  Optional[str] = None
    is_active:      Optional[bool] = None
    notes:          Optional[str] = None
    user_id:        Optional[str] = None    # Owner only

class AttendanceMark(BaseModel):
    date:   str
    status: str = "PRESENT"   # PRESENT / ABSENT / HALF_DAY
    notes:  Optional[str] = None

class BulkAttendanceItem(BaseModel):
    staff_id: str
    status:   str
    notes:    Optional[str] = None

class BulkAttendance(BaseModel):
    date:    str
    records: List[BulkAttendanceItem]

class SalaryPay(BaseModel):
    month:          int
    year:           int
    base_salary:    float
    absent_deduction:   Optional[float] = 0
    half_day_deduction: Optional[float] = 0
    advances:       Optional[float] = 0
    bonus:          Optional[float] = 0
    payment_method: Optional[str] = "CASH"
    notes:          Optional[str] = None

class AdvanceCreate(BaseModel):
    amount: float
    date:   str
    reason: Optional[str] = None
    notes:  Optional[str] = None

class KarigarPaymentCreate(BaseModel):
    amount:       float
    description:  Optional[str] = None
    payment_date: str
    order_id:     Optional[str] = None
    notes:        Optional[str] = None


# ── Helpers ───────────────────────────────────────────────

def _staff_or_404(staff_id: str, db: Session) -> StaffProfile:
    s = db.query(StaffProfile).filter(StaffProfile.id == staff_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Staff member not found")
    return s

def _staff_to_dict(s: StaffProfile) -> dict:
    return {
        "id":             str(s.id),
        "full_name":      s.full_name,
        "phone":          s.phone,
        "email":          s.email,
        "address":        s.address,
        "join_date":      str(s.join_date) if s.join_date else None,
        "staff_type":     s.staff_type or "EMPLOYEE",
        "monthly_salary": float(s.monthly_salary) if s.monthly_salary else 0,
        "day_rate":       float(s.day_rate) if s.day_rate else None,
        "salary_type":    s.salary_type,
        "contract_type":  s.contract_type,
        "is_active":      s.is_active,
        "notes":          s.notes,
        "user_id":        str(s.user_id) if s.user_id else None,
    }


# ── CRUD ──────────────────────────────────────────────────

@router.get("/")
def list_staff(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    today   = date.today().isoformat()
    staff   = db.query(StaffProfile).filter(StaffProfile.is_active == True)\
                .order_by(StaffProfile.full_name).all()
    records = db.query(StaffAttendance)\
                .filter(StaffAttendance.date == today).all()
    att_map = {str(r.staff_id): r.status for r in records}

    return [
        {
            **_staff_to_dict(s),
            "today_attendance": att_map.get(str(s.id)),
        }
        for s in staff
    ]


@router.post("/")
def create_staff(
    data: StaffCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    # only owner can link to a user account
    user_id = None
    if data.user_id:
        if current_user.role != "OWNER":
            raise HTTPException(status_code=403, detail="Only owner can link staff to user accounts")
        user_id = data.user_id

    s = StaffProfile(
        full_name      = data.full_name,
        phone          = data.phone,
        email          = data.email,
        address        = data.address,
        join_date      = data.join_date,
        staff_type     = data.staff_type,
        monthly_salary = data.monthly_salary or 0,
        day_rate       = data.day_rate,
        salary_type    = data.salary_type,
        contract_type  = data.contract_type,
        is_active      = True,
        notes          = data.notes,
        user_id        = user_id,
        created_at     = datetime.utcnow().isoformat(),
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return {"ok": True, "id": str(s.id)}


@router.get("/{staff_id}")
def get_staff(
    staff_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    s = _staff_or_404(staff_id, db)
    result = _staff_to_dict(s)
    # hide user_id from non-owners
    if current_user.role != "OWNER":
        result.pop("user_id", None)
    return result


@router.patch("/{staff_id}")
def update_staff(
    staff_id: str,
    data: StaffUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    s = _staff_or_404(staff_id, db)

    if data.full_name      is not None: s.full_name      = data.full_name
    if data.phone          is not None: s.phone          = data.phone
    if data.email          is not None: s.email          = data.email
    if data.address        is not None: s.address        = data.address
    if data.join_date      is not None: s.join_date      = data.join_date
    if data.staff_type     is not None: s.staff_type     = data.staff_type
    if data.monthly_salary is not None: s.monthly_salary = data.monthly_salary
    if data.day_rate       is not None: s.day_rate       = data.day_rate
    if data.salary_type    is not None: s.salary_type    = data.salary_type
    if data.contract_type  is not None: s.contract_type  = data.contract_type
    if data.is_active      is not None: s.is_active      = data.is_active
    if data.notes          is not None: s.notes          = data.notes

    # only owner can link/unlink user account
    if data.user_id is not None:
        if current_user.role != "OWNER":
            raise HTTPException(status_code=403, detail="Only owner can link staff to user accounts")
        s.user_id = data.user_id

    db.commit()
    return {"ok": True}


# ── Attendance ────────────────────────────────────────────

@router.get("/{staff_id}/attendance")
def get_attendance(
    staff_id: str,
    month: Optional[int] = None,
    year:  Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    _staff_or_404(staff_id, db)
    q = db.query(StaffAttendance).filter(StaffAttendance.staff_id == staff_id)
    if month and year:
        q = q.filter(
            text("EXTRACT(MONTH FROM date) = :m AND EXTRACT(YEAR FROM date) = :y")
        ).params(m=month, y=year)
    rows = q.order_by(StaffAttendance.date).all()
    return [
        {
            "id":     str(r.id),
            "date":   str(r.date),
            "status": r.status,
            "notes":  r.notes,
        }
        for r in rows
    ]


@router.post("/{staff_id}/attendance")
def mark_attendance(
    staff_id: str,
    data: AttendanceMark,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    _staff_or_404(staff_id, db)
    existing = db.query(StaffAttendance).filter(
        StaffAttendance.staff_id == staff_id,
        StaffAttendance.date     == data.date,
    ).first()
    if existing:
        existing.status    = data.status
        existing.notes     = data.notes
        existing.marked_by = str(current_user.id)
    else:
        db.add(StaffAttendance(
            staff_id  = staff_id,
            date      = data.date,
            status    = data.status,
            notes     = data.notes,
            marked_by = str(current_user.id),
        ))
    db.commit()
    return {"ok": True}


# ── Bulk attendance (daily sheet) ─────────────────────────

@router.get("/attendance/daily")
def get_daily_attendance(
    date: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    staff   = db.query(StaffProfile).filter(StaffProfile.is_active == True)\
                .order_by(StaffProfile.full_name).all()
    records = db.query(StaffAttendance)\
                .filter(StaffAttendance.date == date).all()
    att_map = {str(r.staff_id): r for r in records}

    return [
        {
            "staff_id":   str(s.id),
            "full_name":  s.full_name,
            "staff_type": s.staff_type or "EMPLOYEE",
            "attendance": {
                "status": att_map[str(s.id)].status,
                "notes":  att_map[str(s.id)].notes,
            } if str(s.id) in att_map else None,
        }
        for s in staff
    ]


@router.post("/attendance/bulk")
def save_bulk_attendance(
    data: BulkAttendance,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    for item in data.records:
        existing = db.query(StaffAttendance).filter(
            StaffAttendance.staff_id == item.staff_id,
            StaffAttendance.date     == data.date,
        ).first()
        if existing:
            existing.status    = item.status
            existing.notes     = item.notes
            existing.marked_by = str(current_user.id)
        else:
            db.add(StaffAttendance(
                staff_id  = item.staff_id,
                date      = data.date,
                status    = item.status,
                notes     = item.notes,
                marked_by = str(current_user.id),
            ))
    db.commit()
    return {"ok": True}


@router.get("/attendance/monthly")
def get_monthly_attendance(
    month: int,
    year:  int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    staff   = db.query(StaffProfile).filter(StaffProfile.is_active == True)\
                .order_by(StaffProfile.full_name).all()
    records = db.query(StaffAttendance).filter(
        text("EXTRACT(MONTH FROM date) = :m AND EXTRACT(YEAR FROM date) = :y")
    ).params(m=month, y=year).all()

    att_map: dict = {}
    for r in records:
        sid = str(r.staff_id)
        if sid not in att_map:
            att_map[sid] = {}
        att_map[sid][str(r.date)] = r.status

    return {
        "staff":      [{"id": str(s.id), "full_name": s.full_name, "staff_type": s.staff_type} for s in staff],
        "attendance": att_map,
        "month":      month,
        "year":       year,
    }


# ── Salary calculation ────────────────────────────────────

@router.get("/{staff_id}/salary/calculate")
def calculate_salary(
    staff_id: str,
    month: int,
    year:  int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    s = _staff_or_404(staff_id, db)
    base_salary   = float(s.monthly_salary or 0)
    days_in_month = calendar.monthrange(year, month)[1]
    daily_rate    = base_salary / days_in_month if days_in_month else 0

    records = db.query(StaffAttendance).filter(
        StaffAttendance.staff_id == staff_id,
        text("EXTRACT(MONTH FROM date) = :m AND EXTRACT(YEAR FROM date) = :y")
    ).params(m=month, y=year).all()

    present   = sum(1 for r in records if r.status == "PRESENT")
    half_days = sum(1 for r in records if r.status == "HALF_DAY")
    absent    = sum(1 for r in records if r.status == "ABSENT")

    absent_deduction   = round(absent    * daily_rate, 2)
    half_day_deduction = round(half_days * (daily_rate / 2), 2)

    # pending advances
    advances = db.query(SalaryAdvance).filter(
        SalaryAdvance.staff_id == staff_id,
        SalaryAdvance.status   == "PENDING",
    ).all()
    total_advances = round(sum(float(a.amount) for a in advances), 2)

    net_salary = round(base_salary - absent_deduction - half_day_deduction - total_advances, 2)

    # check if already paid this month
    existing_payment = db.query(SalaryPayment).filter(
        SalaryPayment.staff_id == staff_id,
        SalaryPayment.month    == month,
        SalaryPayment.year     == year,
    ).first()

    return {
        "staff_id":           staff_id,
        "month":              month,
        "year":               year,
        "base_salary":        base_salary,
        "days_in_month":      days_in_month,
        "daily_rate":         round(daily_rate, 2),
        "present":            present,
        "half_days":          half_days,
        "absent":             absent,
        "absent_deduction":   absent_deduction,
        "half_day_deduction": half_day_deduction,
        "advances":           total_advances,
        "net_salary":         net_salary,
        "already_paid":       existing_payment is not None,
        "paid_amount":        float(existing_payment.final_amount) if existing_payment else None,
    }


# ── Salary payments ───────────────────────────────────────

@router.get("/{staff_id}/salary")
def get_salary_history(
    staff_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    _staff_or_404(staff_id, db)
    rows = db.query(SalaryPayment).filter(SalaryPayment.staff_id == staff_id)\
             .order_by(SalaryPayment.year.desc(), SalaryPayment.month.desc()).all()
    return [
        {
            "id":                 str(r.id),
            "month":              r.month,
            "year":               r.year,
            "base_salary":        float(r.base_salary),
            "absent_deduction":   float(r.deductions or 0),
            "advances":           float(r.advances or 0),
            "bonus":              float(r.bonus or 0),
            "final_amount":       float(r.final_amount),
            "status":             r.status,
            "payment_method":     r.payment_method,
            "paid_at":            r.paid_at,
            "notes":              r.notes,
        }
        for r in rows
    ]


@router.post("/{staff_id}/salary/pay")
def pay_salary(
    staff_id: str,
    data: SalaryPay,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    _staff_or_404(staff_id, db)

    existing = db.query(SalaryPayment).filter(
        SalaryPayment.staff_id == staff_id,
        SalaryPayment.month    == data.month,
        SalaryPayment.year     == data.year,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Salary already paid for this month")

    total_deductions = (data.absent_deduction or 0) + (data.half_day_deduction or 0)
    final = data.base_salary + (data.bonus or 0) - total_deductions - (data.advances or 0)

    sp = SalaryPayment(
        staff_id       = staff_id,
        month          = data.month,
        year           = data.year,
        base_salary    = data.base_salary,
        advances       = data.advances or 0,
        deductions     = total_deductions,
        bonus          = data.bonus or 0,
        final_amount   = final,
        status         = "PAID",
        payment_method = data.payment_method,
        notes          = data.notes,
        paid_at        = datetime.utcnow().isoformat(),
        created_by     = str(current_user.id),
    )
    db.add(sp)

    # mark all pending advances as repaid
    db.query(SalaryAdvance).filter(
        SalaryAdvance.staff_id == staff_id,
        SalaryAdvance.status   == "PENDING",
    ).update({"status": "REPAID"})

    db.commit()
    return {"ok": True, "final_amount": float(sp.final_amount)}


# ── Advances ──────────────────────────────────────────────

@router.get("/{staff_id}/advances")
def get_advances(
    staff_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    _staff_or_404(staff_id, db)
    rows = db.query(SalaryAdvance).filter(SalaryAdvance.staff_id == staff_id)\
             .order_by(SalaryAdvance.date.desc()).all()
    return [
        {
            "id":     str(r.id),
            "amount": float(r.amount),
            "date":   str(r.date),
            "reason": r.reason,
            "notes":  r.notes,
            "status": r.status,
        }
        for r in rows
    ]


@router.post("/{staff_id}/advances")
def create_advance(
    staff_id: str,
    data: AdvanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    _staff_or_404(staff_id, db)
    adv = SalaryAdvance(
        staff_id    = staff_id,
        amount      = data.amount,
        date        = data.date,
        reason      = data.reason,
        notes       = data.notes,
        status      = "PENDING",
        approved_by = str(current_user.id),
        created_at  = datetime.utcnow().isoformat(),
    )
    db.add(adv)
    db.commit()
    return {"ok": True}


@router.patch("/{staff_id}/advances/{advance_id}")
def update_advance(
    staff_id:   str,
    advance_id: str,
    status:     str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    adv = db.query(SalaryAdvance).filter(
        SalaryAdvance.id       == advance_id,
        SalaryAdvance.staff_id == staff_id,
    ).first()
    if not adv:
        raise HTTPException(status_code=404, detail="Advance not found")
    adv.status = status
    db.commit()
    return {"ok": True}


# ── Karigar payments ──────────────────────────────────────

@router.get("/{staff_id}/karigar-payments")
def get_karigar_payments(
    staff_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    _staff_or_404(staff_id, db)
    rows = db.query(KarigarPayment).filter(KarigarPayment.staff_id == staff_id)\
             .order_by(KarigarPayment.payment_date.desc()).all()
    return [
        {
            "id":           str(r.id),
            "amount":       float(r.amount),
            "description":  r.description,
            "payment_date": str(r.payment_date),
            "notes":        r.notes,
        }
        for r in rows
    ]


@router.post("/{staff_id}/karigar-payments")
def create_karigar_payment(
    staff_id: str,
    data: KarigarPaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    _staff_or_404(staff_id, db)
    kp = KarigarPayment(
        staff_id     = staff_id,
        amount       = data.amount,
        description  = data.description,
        payment_date = data.payment_date,
        order_id     = data.order_id,
        notes        = data.notes,
        created_by   = str(current_user.id),
        created_at   = datetime.utcnow().isoformat(),
    )
    db.add(kp)
    db.commit()
    db.refresh(kp)
    return {"ok": True}