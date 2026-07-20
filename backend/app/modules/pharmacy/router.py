"""Pharmacy medicine/batch/dispense endpoints - a real toggleable department package."""
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, selectinload

from app.core.audit.service import record_audit
from app.core.auth.dependencies import get_current_user
from app.core.auth.models import User
from app.core.patients.models import Patient
from app.database import get_db
from app.modules.opd.models import Prescription
from app.modules.pharmacy.models import (
    Dispense,
    DispenseItem,
    DispenseItemBatch,
    Medicine,
    MedicineBatch,
)
from app.modules.pharmacy.schemas import (
    DispenseCreate,
    DispenseListItem,
    DispenseOut,
    DispenseSearchResponse,
    ExpiringBatchItem,
    LowStockItem,
    MedicineBatchCreate,
    MedicineCreate,
    MedicineListItem,
    MedicineOut,
    MedicinePatch,
    MedicineSearchResponse,
)
from app.modules.pharmacy.service import deduct_fefo

router = APIRouter(prefix="/pharmacy", tags=["pharmacy"])

MODULE_MANIFEST = {
    "id": "pharmacy",
    "name": "Pharmacy",
    "version": "0.1.0",
    "depends_on": [],
}


def _client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


def _total_quantity_subquery(db: Session):
    return (
        db.query(MedicineBatch.medicine_id, func.coalesce(func.sum(MedicineBatch.quantity_on_hand), 0).label("total"))
        .group_by(MedicineBatch.medicine_id)
        .subquery()
    )


@router.post("/medicines", response_model=MedicineOut, status_code=status.HTTP_201_CREATED)
def create_medicine(
    payload: MedicineCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    medicine = Medicine(
        name=payload.name,
        hsn_code=payload.hsn_code,
        gst_rate=payload.gst_rate,
        unit=payload.unit,
        reorder_level=payload.reorder_level,
    )
    db.add(medicine)
    db.flush()

    record_audit(
        db,
        actor_user_id=current_user.user_id,
        action="pharmacy.medicine.create",
        entity="pharmacy_medicine",
        entity_id=str(medicine.medicine_id),
        ip_address=_client_ip(request),
    )
    db.commit()
    db.refresh(medicine)
    return medicine


@router.get("/medicines", response_model=MedicineSearchResponse)
def list_medicines(
    q: str | None = Query(default=None),
    low_stock_only: bool = Query(default=False),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    totals = _total_quantity_subquery(db)
    query = (
        db.query(
            Medicine.medicine_id,
            Medicine.name,
            Medicine.unit,
            Medicine.reorder_level,
            Medicine.is_active,
            func.coalesce(totals.c.total, 0).label("total_quantity"),
        )
        .outerjoin(totals, totals.c.medicine_id == Medicine.medicine_id)
    )
    if q:
        like = f"%{q}%"
        query = query.filter(or_(Medicine.name.ilike(like), Medicine.hsn_code.ilike(like)))
    if low_stock_only:
        query = query.filter(func.coalesce(totals.c.total, 0) < Medicine.reorder_level)

    total = query.count()
    rows = query.order_by(Medicine.name).offset(offset).limit(limit).all()
    items = [
        MedicineListItem(
            medicine_id=r.medicine_id,
            name=r.name,
            unit=r.unit,
            reorder_level=r.reorder_level,
            is_active=r.is_active,
            total_quantity=r.total_quantity,
        )
        for r in rows
    ]
    return MedicineSearchResponse(items=items, total=total)


@router.get("/medicines/{medicine_id}", response_model=MedicineOut)
def get_medicine(
    medicine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    medicine = (
        db.query(Medicine)
        .options(selectinload(Medicine.batches))
        .filter(Medicine.medicine_id == medicine_id)
        .first()
    )
    if medicine is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Medicine not found")
    return medicine


@router.patch("/medicines/{medicine_id}", response_model=MedicineOut)
def patch_medicine(
    medicine_id: int,
    payload: MedicinePatch,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    medicine = db.get(Medicine, medicine_id)
    if medicine is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Medicine not found")

    if payload.is_active is not None:
        medicine.is_active = payload.is_active
    if payload.reorder_level is not None:
        medicine.reorder_level = payload.reorder_level

    record_audit(
        db,
        actor_user_id=current_user.user_id,
        action="pharmacy.medicine.update",
        entity="pharmacy_medicine",
        entity_id=str(medicine.medicine_id),
        ip_address=_client_ip(request),
    )
    db.commit()
    db.refresh(medicine)
    return medicine


@router.post("/medicines/{medicine_id}/batches", response_model=MedicineOut, status_code=status.HTTP_201_CREATED)
def receive_batch(
    medicine_id: int,
    payload: MedicineBatchCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    medicine = db.get(Medicine, medicine_id)
    if medicine is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Medicine not found")

    batch = MedicineBatch(
        medicine_id=medicine_id,
        batch_number=payload.batch_number,
        expiry_date=payload.expiry_date,
        quantity_on_hand=payload.quantity,
        cost_price=payload.cost_price,
        mrp=payload.mrp,
    )
    db.add(batch)
    db.flush()

    record_audit(
        db,
        actor_user_id=current_user.user_id,
        action="pharmacy.batch.create",
        entity="pharmacy_medicine_batch",
        entity_id=str(batch.batch_id),
        ip_address=_client_ip(request),
    )
    db.commit()
    db.refresh(medicine)
    return medicine


@router.get("/alerts/low-stock", response_model=list[LowStockItem])
def low_stock_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    totals = _total_quantity_subquery(db)
    rows = (
        db.query(
            Medicine.medicine_id,
            Medicine.name,
            Medicine.unit,
            Medicine.reorder_level,
            func.coalesce(totals.c.total, 0).label("total_quantity"),
        )
        .outerjoin(totals, totals.c.medicine_id == Medicine.medicine_id)
        .filter(Medicine.is_active.is_(True), func.coalesce(totals.c.total, 0) < Medicine.reorder_level)
        .order_by(Medicine.name)
        .all()
    )
    return [
        LowStockItem(
            medicine_id=r.medicine_id, name=r.name, unit=r.unit,
            total_quantity=r.total_quantity, reorder_level=r.reorder_level,
        )
        for r in rows
    ]


@router.get("/alerts/expiring", response_model=list[ExpiringBatchItem])
def expiring_alerts(
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cutoff = date.today() + timedelta(days=days)
    rows = (
        db.query(MedicineBatch, Medicine.name)
        .join(Medicine, Medicine.medicine_id == MedicineBatch.medicine_id)
        .filter(MedicineBatch.quantity_on_hand > 0, MedicineBatch.expiry_date <= cutoff)
        .order_by(MedicineBatch.expiry_date)
        .all()
    )
    today = date.today()
    return [
        ExpiringBatchItem(
            batch_id=batch.batch_id,
            medicine_id=batch.medicine_id,
            medicine_name=medicine_name,
            batch_number=batch.batch_number,
            expiry_date=batch.expiry_date,
            quantity_on_hand=batch.quantity_on_hand,
            days_until_expiry=(batch.expiry_date - today).days,
        )
        for batch, medicine_name in rows
    ]


@router.post("/dispenses", response_model=DispenseOut, status_code=status.HTTP_201_CREATED)
def create_dispense(
    payload: DispenseCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if db.get(Patient, payload.patient_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient not found")

    if payload.prescription_id is not None:
        prescription = (
            db.query(Prescription)
            .options(selectinload(Prescription.consultation))
            .filter(Prescription.rx_id == payload.prescription_id)
            .first()
        )
        if prescription is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Prescription not found")
        if prescription.consultation.patient_id != payload.patient_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Prescription does not belong to this patient")

    for item in payload.items:
        if db.get(Medicine, item.medicine_id) is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, f"Medicine {item.medicine_id} not found")

    dispense = Dispense(
        patient_id=payload.patient_id,
        prescription_id=payload.prescription_id,
        dispensed_by=current_user.user_id,
    )
    db.add(dispense)
    db.flush()

    for item in payload.items:
        dispense_item = DispenseItem(dispense_id=dispense.dispense_id, medicine_id=item.medicine_id, quantity=item.quantity)
        db.add(dispense_item)
        db.flush()

        allocations = deduct_fefo(db, item.medicine_id, item.quantity)
        for batch, taken in allocations:
            db.add(DispenseItemBatch(dispense_item_id=dispense_item.item_id, batch_id=batch.batch_id, quantity_deducted=taken))

    record_audit(
        db,
        actor_user_id=current_user.user_id,
        action="pharmacy.dispense.create",
        entity="pharmacy_dispense",
        entity_id=str(dispense.dispense_id),
        ip_address=_client_ip(request),
    )
    db.commit()

    return (
        db.query(Dispense)
        .options(
            selectinload(Dispense.items).selectinload(DispenseItem.medicine),
            selectinload(Dispense.items).selectinload(DispenseItem.batch_allocations).selectinload(DispenseItemBatch.batch),
        )
        .filter(Dispense.dispense_id == dispense.dispense_id)
        .first()
    )


@router.get("/dispenses", response_model=DispenseSearchResponse)
def list_dispenses(
    patient_id: int | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Dispense)
    if patient_id is not None:
        query = query.filter(Dispense.patient_id == patient_id)

    total = query.count()
    items = query.order_by(Dispense.dispensed_at.desc()).offset(offset).limit(limit).all()
    return DispenseSearchResponse(items=items, total=total)


@router.get("/dispenses/{dispense_id}", response_model=DispenseOut)
def get_dispense(
    dispense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dispense = (
        db.query(Dispense)
        .options(
            selectinload(Dispense.items).selectinload(DispenseItem.medicine),
            selectinload(Dispense.items).selectinload(DispenseItem.batch_allocations).selectinload(DispenseItemBatch.batch),
        )
        .filter(Dispense.dispense_id == dispense_id)
        .first()
    )
    if dispense is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Dispense not found")
    return dispense
