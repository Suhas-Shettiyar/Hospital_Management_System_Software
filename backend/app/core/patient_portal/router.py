"""Patient-facing read-only endpoints, plus self-service appointment
booking. Core, always-on (mounted directly in main.py, no plugin manifest,
same as billing_engine) - not a toggleable department package, since it's
fundamentally an identity/access-scoped view over other packages' data
rather than a department of its own.

Every endpoint requires the caller to actually BE the patient whose data is
being requested - _require_patient() is the real security boundary here
(the frontend's separate /portal shell is UX, not enforcement, see the
Patient Portal plan). Deliberately reaches into app.modules.opd/lab/
appointments directly, same "core touches modules explicitly" precedent
already established in alembic/env.py and main.py's loader.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session, selectinload

from app.core.audit.service import record_audit
from app.core.auth.dependencies import get_current_user
from app.core.auth.models import User, UserRole, UserStatus
from app.core.auth.schemas import UserOut
from app.core.billing_engine.models import Bill, BillStatus
from app.core.billing_engine.schemas import BillOut, BillSearchResponse
from app.core.patient_portal.schemas import PortalAppointmentCreate
from app.core.patients.models import Patient
from app.core.patients.schemas import PatientOut
from app.database import get_db
from app.modules.appointments.models import Appointment
from app.modules.appointments.schemas import AppointmentOut, AppointmentSearchResponse
from app.modules.lab.models import LabOrder
from app.modules.lab.schemas import LabOrderOut, LabOrderSearchResponse
from app.modules.opd.models import Consultation, Prescription
from app.modules.opd.schemas import ConsultationOut, ConsultationSearchResponse

router = APIRouter(prefix="/portal", tags=["patient-portal"])


def _client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


def _require_patient(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.PATIENT or current_user.patient_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Patient portal access required")
    return current_user


@router.get("/me", response_model=PatientOut)
def get_my_patient_record(
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_patient),
):
    return db.get(Patient, current_user.patient_id)


@router.get("/consultations", response_model=ConsultationSearchResponse)
def list_my_consultations(
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_patient),
):
    query = (
        db.query(Consultation)
        .options(selectinload(Consultation.prescription).selectinload(Prescription.items))
        .filter(Consultation.patient_id == current_user.patient_id)
        .order_by(Consultation.consult_date.desc())
    )
    items = query.all()
    return ConsultationSearchResponse(items=items, total=len(items))


@router.get("/consultations/{consult_id}", response_model=ConsultationOut)
def get_my_consultation(
    consult_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_patient),
):
    consult = (
        db.query(Consultation)
        .options(selectinload(Consultation.prescription).selectinload(Prescription.items))
        .filter(Consultation.consult_id == consult_id, Consultation.patient_id == current_user.patient_id)
        .first()
    )
    if consult is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Consultation not found")
    return consult


@router.get("/lab-orders", response_model=LabOrderSearchResponse)
def list_my_lab_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_patient),
):
    query = (
        db.query(LabOrder)
        .options(selectinload(LabOrder.result), selectinload(LabOrder.catalog))
        .filter(LabOrder.patient_id == current_user.patient_id)
        .order_by(LabOrder.ordered_at.desc())
    )
    items = query.all()
    return LabOrderSearchResponse(items=items, total=len(items))


@router.get("/lab-orders/{order_id}", response_model=LabOrderOut)
def get_my_lab_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_patient),
):
    order = (
        db.query(LabOrder)
        .options(selectinload(LabOrder.result), selectinload(LabOrder.catalog))
        .filter(LabOrder.order_id == order_id, LabOrder.patient_id == current_user.patient_id)
        .first()
    )
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lab order not found")
    return order


@router.get("/bills", response_model=BillSearchResponse)
def list_my_bills(
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_patient),
):
    # Draft bills are an in-progress internal record, not yet real to the
    # patient - never shown here, only finalized/paid/cancelled.
    query = (
        db.query(Bill)
        .filter(Bill.patient_id == current_user.patient_id, Bill.status != BillStatus.DRAFT)
        .order_by(Bill.created_at.desc())
    )
    items = query.all()
    return BillSearchResponse(items=items, total=len(items))


@router.get("/bills/{bill_id}", response_model=BillOut)
def get_my_bill(
    bill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_patient),
):
    bill = (
        db.query(Bill)
        .options(selectinload(Bill.items), selectinload(Bill.payments))
        .filter(
            Bill.bill_id == bill_id,
            Bill.patient_id == current_user.patient_id,
            Bill.status != BillStatus.DRAFT,
        )
        .first()
    )
    if bill is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Bill not found")
    return bill


@router.get("/doctors", response_model=list[UserOut])
def list_doctors(
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_patient),
):
    return (
        db.query(User)
        .filter(User.role == UserRole.DOCTOR, User.status == UserStatus.ACTIVE)
        .order_by(User.name)
        .all()
    )


@router.get("/appointments", response_model=AppointmentSearchResponse)
def list_my_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_patient),
):
    query = (
        db.query(Appointment)
        .filter(Appointment.patient_id == current_user.patient_id)
        .order_by(Appointment.scheduled_at.desc())
    )
    items = query.all()
    return AppointmentSearchResponse(items=items, total=len(items))


@router.post("/appointments", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def book_my_appointment(
    payload: PortalAppointmentCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_patient),
):
    doctor = db.get(User, payload.doctor_id)
    if doctor is None or doctor.role != UserRole.DOCTOR:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Doctor not found")

    appointment = Appointment(
        patient_id=current_user.patient_id,
        doctor_id=payload.doctor_id,
        scheduled_at=payload.scheduled_at,
        reason=payload.reason,
        created_by=current_user.user_id,
    )
    db.add(appointment)
    db.flush()

    record_audit(
        db,
        actor_user_id=current_user.user_id,
        action="portal.appointments.book",
        entity="appointment",
        entity_id=str(appointment.appointment_id),
        ip_address=_client_ip(request),
    )
    db.commit()
    db.refresh(appointment)
    return appointment
