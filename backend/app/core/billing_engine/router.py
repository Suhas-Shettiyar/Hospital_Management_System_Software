"""Billing endpoints - core, always-on (mounted directly in main.py, no
plugin manifest / enable-disable, unlike the toggleable department packages)."""
from datetime import date, datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.core.audit.service import record_audit
from app.core.auth.dependencies import require
from app.core.auth.models import User
from app.core.billing_engine.models import Bill, BillItem, BillStatus, Payment, PaymentMode
from app.core.billing_engine.schemas import (
    BillCreate,
    BillItemCreate,
    BillOut,
    BillSearchResponse,
    DailyReportModeBreakdown,
    DailyReportOut,
    PaymentCreate,
)
from app.core.patients.models import Patient
from app.database import get_db

router = APIRouter(prefix="/billing", tags=["billing"])


def _client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


def _with_relations(query):
    return query.options(selectinload(Bill.items), selectinload(Bill.payments))


def _get_bill_or_404(db: Session, bill_id: int) -> Bill:
    bill = _with_relations(db.query(Bill)).filter(Bill.bill_id == bill_id).first()
    if bill is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Bill not found")
    return bill


def _recompute_total(bill: Bill) -> None:
    bill.total = sum((item.line_total for item in bill.items), start=Decimal("0"))


@router.post("/bills", response_model=BillOut, status_code=status.HTTP_201_CREATED)
def create_bill(
    payload: BillCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("billing:write")),
):
    if db.get(Patient, payload.patient_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient not found")

    bill = Bill(patient_id=payload.patient_id, created_by=current_user.user_id)
    db.add(bill)
    db.flush()

    record_audit(
        db,
        actor_user_id=current_user.user_id,
        action="billing.bill.create",
        entity="bill",
        entity_id=str(bill.bill_id),
        ip_address=_client_ip(request),
    )
    db.commit()
    return _get_bill_or_404(db, bill.bill_id)


@router.get("/bills", response_model=BillSearchResponse)
def list_bills(
    patient_id: int | None = Query(default=None),
    status_: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require("billing:read")),
):
    query = db.query(Bill)
    if patient_id is not None:
        query = query.filter(Bill.patient_id == patient_id)
    if status_ is not None:
        query = query.filter(Bill.status == status_)

    total = query.count()
    items = query.order_by(Bill.created_at.desc()).offset(offset).limit(limit).all()
    return BillSearchResponse(items=items, total=total)


@router.get("/bills/{bill_id}", response_model=BillOut)
def get_bill(
    bill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("billing:read")),
):
    return _get_bill_or_404(db, bill_id)


@router.post("/bills/{bill_id}/items", response_model=BillOut, status_code=status.HTTP_201_CREATED)
def add_item(
    bill_id: int,
    payload: BillItemCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("billing:write")),
):
    bill = _get_bill_or_404(db, bill_id)
    if bill.status != BillStatus.DRAFT:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Cannot add an item to a bill with status '{bill.status}'")

    quantity = Decimal(payload.quantity)
    unit_price = Decimal(str(payload.unit_price))
    gst_rate = Decimal(str(payload.gst_rate))
    subtotal = quantity * unit_price
    gst_amount = (subtotal * gst_rate / Decimal("100")).quantize(Decimal("0.01"))
    line_total = subtotal + gst_amount

    item = BillItem(
        bill_id=bill.bill_id,
        description=payload.description,
        quantity=payload.quantity,
        unit_price=payload.unit_price,
        gst_rate=payload.gst_rate,
        subtotal=subtotal,
        gst_amount=gst_amount,
        line_total=line_total,
    )
    db.add(item)
    bill.items.append(item)
    _recompute_total(bill)

    record_audit(
        db,
        actor_user_id=current_user.user_id,
        action="billing.item.add",
        entity="bill",
        entity_id=str(bill.bill_id),
        ip_address=_client_ip(request),
    )
    db.commit()
    return _get_bill_or_404(db, bill.bill_id)


@router.delete("/bills/{bill_id}/items/{item_id}", response_model=BillOut)
def remove_item(
    bill_id: int,
    item_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("billing:write")),
):
    bill = _get_bill_or_404(db, bill_id)
    if bill.status != BillStatus.DRAFT:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Cannot remove an item from a bill with status '{bill.status}'")

    item = next((i for i in bill.items if i.item_id == item_id), None)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Bill item not found")

    db.delete(item)
    bill.items.remove(item)
    _recompute_total(bill)

    record_audit(
        db,
        actor_user_id=current_user.user_id,
        action="billing.item.remove",
        entity="bill",
        entity_id=str(bill.bill_id),
        ip_address=_client_ip(request),
    )
    db.commit()
    return _get_bill_or_404(db, bill.bill_id)


@router.post("/bills/{bill_id}/finalize", response_model=BillOut)
def finalize_bill(
    bill_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("billing:write")),
):
    bill = _get_bill_or_404(db, bill_id)
    if bill.status != BillStatus.DRAFT:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Cannot finalize a bill with status '{bill.status}'")

    bill.status = BillStatus.FINALIZED
    bill.finalized_at = datetime.utcnow()

    record_audit(
        db,
        actor_user_id=current_user.user_id,
        action="billing.finalize",
        entity="bill",
        entity_id=str(bill.bill_id),
        ip_address=_client_ip(request),
    )
    db.commit()
    return _get_bill_or_404(db, bill.bill_id)


@router.post("/bills/{bill_id}/cancel", response_model=BillOut)
def cancel_bill(
    bill_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("billing:write")),
):
    bill = _get_bill_or_404(db, bill_id)
    if bill.status not in (BillStatus.DRAFT, BillStatus.FINALIZED):
        raise HTTPException(status.HTTP_409_CONFLICT, f"Cannot cancel a bill with status '{bill.status}'")

    bill.status = BillStatus.CANCELLED

    record_audit(
        db,
        actor_user_id=current_user.user_id,
        action="billing.cancel",
        entity="bill",
        entity_id=str(bill.bill_id),
        ip_address=_client_ip(request),
    )
    db.commit()
    return _get_bill_or_404(db, bill.bill_id)


@router.post("/bills/{bill_id}/payments", response_model=BillOut, status_code=status.HTTP_201_CREATED)
def record_payment(
    bill_id: int,
    payload: PaymentCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("billing:collect")),
):
    if payload.mode not in PaymentMode.ALL:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Invalid payment mode '{payload.mode}'")

    bill = _get_bill_or_404(db, bill_id)
    if bill.status != BillStatus.FINALIZED:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Cannot record a payment against a bill with status '{bill.status}'")

    payment = Payment(
        bill_id=bill.bill_id,
        # Normalized to Decimal so it sums cleanly with amounts already
        # loaded from the DB (Numeric columns deserialize to Decimal) -
        # a fresh, uncommitted ORM attribute otherwise stays whatever
        # Python type Pydantic gave it (float), and Decimal + float raises.
        amount=Decimal(str(payload.amount)),
        mode=payload.mode,
        reference_number=payload.reference_number,
        received_by=current_user.user_id,
    )
    db.add(payment)
    bill.payments.append(payment)

    total_paid = sum((Decimal(str(p.amount)) for p in bill.payments), start=Decimal("0"))
    if total_paid >= Decimal(str(bill.total)):
        bill.status = BillStatus.PAID

    record_audit(
        db,
        actor_user_id=current_user.user_id,
        action="billing.payment.record",
        entity="bill",
        entity_id=str(bill.bill_id),
        ip_address=_client_ip(request),
    )
    db.commit()
    return _get_bill_or_404(db, bill.bill_id)


@router.get("/reports/daily", response_model=DailyReportOut)
def daily_report(
    on_date: date = Query(alias="date", default_factory=date.today),
    db: Session = Depends(get_db),
    current_user: User = Depends(require("reports:view")),
):
    day_start = datetime.combine(on_date, datetime.min.time())
    day_end = day_start + timedelta(days=1)

    billed_query = db.query(Bill).filter(
        Bill.finalized_at.isnot(None), Bill.finalized_at >= day_start, Bill.finalized_at < day_end
    )
    total_billed = billed_query.with_entities(func.coalesce(func.sum(Bill.total), 0)).scalar()
    bill_count = billed_query.count()

    collected_query = db.query(Payment).filter(Payment.received_at >= day_start, Payment.received_at < day_end)
    total_collected = collected_query.with_entities(func.coalesce(func.sum(Payment.amount), 0)).scalar()

    by_mode_rows = (
        collected_query.with_entities(Payment.mode, func.coalesce(func.sum(Payment.amount), 0))
        .group_by(Payment.mode)
        .all()
    )

    return DailyReportOut(
        date=on_date,
        total_billed=total_billed,
        bill_count=bill_count,
        total_collected=total_collected,
        by_mode=[DailyReportModeBreakdown(mode=mode, amount=amount) for mode, amount in by_mode_rows],
    )
