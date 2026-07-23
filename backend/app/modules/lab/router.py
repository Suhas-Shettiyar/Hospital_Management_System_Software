"""Lab order/result endpoints - a real toggleable department package."""
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from app.core.audit.service import record_audit
from app.core.auth.dependencies import get_current_user
from app.core.auth.models import User
from app.core.patients.models import Patient
from app.database import get_db
from app.modules.lab.models import LabOrder, LabOrderStatus, LabResult, LabTestCatalog
from app.modules.lab.schemas import (
    LabOrderCreate,
    LabOrderListItem,
    LabOrderOut,
    LabOrderSearchResponse,
    LabResultIn,
    LabTestCatalogSearchResponse,
)
from app.modules.opd.models import Consultation

router = APIRouter(prefix="/lab", tags=["lab"])

MODULE_MANIFEST = {
    "id": "lab",
    "name": "Laboratory",
    "version": "0.1.0",
    "depends_on": [],
}


def _client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


@router.post("/orders", response_model=LabOrderOut, status_code=status.HTTP_201_CREATED)
def create_order(
    payload: LabOrderCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if db.get(Patient, payload.patient_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient not found")

    if payload.consult_id is not None:
        consult = db.get(Consultation, payload.consult_id)
        if consult is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Consultation not found")
        if consult.patient_id != payload.patient_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Consultation does not belong to this patient")

    # Two ways to name a test: a catalog entry (preferred - canonical
    # loinc_code/test_name, denormalized onto the order at creation time) or
    # the free-text fallback. Client-supplied test_code/test_name are ignored
    # when catalog_id is given, so the order always reflects what the
    # catalog said at order time, not whatever the client happened to send.
    if payload.catalog_id is not None:
        catalog_entry = (
            db.query(LabTestCatalog)
            .filter(LabTestCatalog.catalog_id == payload.catalog_id, LabTestCatalog.is_active.is_(True))
            .first()
        )
        if catalog_entry is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Catalog test not found")
        test_code = catalog_entry.loinc_code
        test_name = catalog_entry.test_name
    else:
        if not payload.test_name:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "test_name is required when no catalog_id is given")
        test_code = payload.test_code
        test_name = payload.test_name

    order = LabOrder(
        patient_id=payload.patient_id,
        consult_id=payload.consult_id,
        catalog_id=payload.catalog_id,
        test_code=test_code,
        test_name=test_name,
        ordered_by=current_user.user_id,
    )
    db.add(order)
    db.flush()

    record_audit(
        db,
        actor_user_id=current_user.user_id,
        action="lab.order.create",
        entity="lab_order",
        entity_id=str(order.order_id),
        ip_address=_client_ip(request),
    )
    db.commit()
    db.refresh(order)
    return order


@router.get("/catalog", response_model=LabTestCatalogSearchResponse)
def search_catalog(
    q: str = Query(default=""),
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(LabTestCatalog).filter(LabTestCatalog.is_active.is_(True))
    if q:
        like = f"%{q}%"
        query = query.filter(or_(LabTestCatalog.test_name.ilike(like), LabTestCatalog.loinc_code.ilike(like)))

    total = query.count()
    items = query.order_by(LabTestCatalog.test_name).limit(limit).all()
    return LabTestCatalogSearchResponse(items=items, total=total)


@router.get("/orders", response_model=LabOrderSearchResponse)
def list_orders(
    patient_id: int | None = Query(default=None),
    consult_id: int | None = Query(default=None),
    status_: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(LabOrder)
    if patient_id is not None:
        query = query.filter(LabOrder.patient_id == patient_id)
    if consult_id is not None:
        query = query.filter(LabOrder.consult_id == consult_id)
    if status_ is not None:
        query = query.filter(LabOrder.status == status_)

    total = query.count()
    items = query.order_by(LabOrder.ordered_at.desc()).offset(offset).limit(limit).all()
    return LabOrderSearchResponse(items=items, total=total)


@router.get("/orders/{order_id}", response_model=LabOrderOut)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = (
        db.query(LabOrder)
        .options(selectinload(LabOrder.result), selectinload(LabOrder.catalog))
        .filter(LabOrder.order_id == order_id)
        .first()
    )
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lab order not found")
    return order


@router.post("/orders/{order_id}/result", response_model=LabOrderOut, status_code=status.HTTP_201_CREATED)
def enter_result(
    order_id: int,
    payload: LabResultIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = db.get(LabOrder, order_id)
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lab order not found")
    if order.result is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Result already recorded for this order")

    result = LabResult(
        order_id=order.order_id,
        result_data=payload.result_data,
        reference_range=payload.reference_range,
        uploaded_by=current_user.user_id,
    )
    order.status = LabOrderStatus.COMPLETED
    db.add(result)

    record_audit(
        db,
        actor_user_id=current_user.user_id,
        action="lab.result.create",
        entity="lab_order",
        entity_id=str(order.order_id),
        ip_address=_client_ip(request),
    )
    db.commit()
    db.refresh(order)
    return order
