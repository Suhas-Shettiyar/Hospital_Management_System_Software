"""Appointments booking/check-in/queue endpoints - a real toggleable department package."""
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.audit.service import record_audit
from app.core.auth.dependencies import get_current_user
from app.core.auth.models import User, UserRole, UserStatus
from app.core.auth.schemas import UserOut
from app.core.patients.models import Patient
from app.database import get_db
from app.modules.appointments.models import Appointment, AppointmentStatus
from app.modules.appointments.schemas import (
    AppointmentCreate,
    AppointmentOut,
    AppointmentSearchResponse,
)

router = APIRouter(prefix="/appointments", tags=["appointments"])

MODULE_MANIFEST = {
    "id": "appointments",
    "name": "Appointments",
    "version": "0.1.0",
    "depends_on": [],
}


def _client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


@router.get("/doctors", response_model=list[UserOut])
def list_doctors(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(User)
        .filter(User.role == UserRole.DOCTOR, User.status == UserStatus.ACTIVE)
        .order_by(User.name)
        .all()
    )


@router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def book_appointment(
    payload: AppointmentCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if db.get(Patient, payload.patient_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient not found")

    doctor = db.get(User, payload.doctor_id)
    if doctor is None or doctor.role != UserRole.DOCTOR:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Doctor not found")

    appointment = Appointment(
        patient_id=payload.patient_id,
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
        action="appointments.book",
        entity="appointment",
        entity_id=str(appointment.appointment_id),
        ip_address=_client_ip(request),
    )
    db.commit()
    db.refresh(appointment)
    return appointment


@router.get("", response_model=AppointmentSearchResponse)
def list_appointments(
    patient_id: int | None = Query(default=None),
    doctor_id: int | None = Query(default=None),
    status_: str | None = Query(default=None, alias="status"),
    on_date: date | None = Query(default=None, alias="date"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Appointment)
    if patient_id is not None:
        query = query.filter(Appointment.patient_id == patient_id)
    if doctor_id is not None:
        query = query.filter(Appointment.doctor_id == doctor_id)
    if status_ is not None:
        query = query.filter(Appointment.status == status_)
    if on_date is not None:
        query = query.filter(
            Appointment.scheduled_at >= datetime.combine(on_date, datetime.min.time()),
            Appointment.scheduled_at < datetime.combine(on_date, datetime.max.time()),
        )

    total = query.count()
    items = query.order_by(Appointment.scheduled_at).offset(offset).limit(limit).all()
    return AppointmentSearchResponse(items=items, total=total)


@router.get("/{appointment_id}", response_model=AppointmentOut)
def get_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    appointment = db.get(Appointment, appointment_id)
    if appointment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Appointment not found")
    return appointment


def _transition(
    db: Session,
    request: Request,
    current_user: User,
    appointment_id: int,
    *,
    from_statuses: tuple[str, ...],
    to_status: str,
    action: str,
    set_checked_in_at: bool = False,
) -> Appointment:
    appointment = db.get(Appointment, appointment_id)
    if appointment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Appointment not found")
    if appointment.status not in from_statuses:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Cannot {action.split('.')[-1]} an appointment with status '{appointment.status}'",
        )

    appointment.status = to_status
    if set_checked_in_at:
        appointment.checked_in_at = datetime.utcnow()

    record_audit(
        db,
        actor_user_id=current_user.user_id,
        action=action,
        entity="appointment",
        entity_id=str(appointment.appointment_id),
        ip_address=_client_ip(request),
    )
    db.commit()
    db.refresh(appointment)
    return appointment


@router.post("/{appointment_id}/check-in", response_model=AppointmentOut)
def check_in(
    appointment_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _transition(
        db, request, current_user, appointment_id,
        from_statuses=(AppointmentStatus.SCHEDULED,),
        to_status=AppointmentStatus.CHECKED_IN,
        action="appointments.check_in",
        set_checked_in_at=True,
    )


@router.post("/{appointment_id}/complete", response_model=AppointmentOut)
def complete(
    appointment_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _transition(
        db, request, current_user, appointment_id,
        from_statuses=(AppointmentStatus.CHECKED_IN,),
        to_status=AppointmentStatus.COMPLETED,
        action="appointments.complete",
    )


@router.post("/{appointment_id}/cancel", response_model=AppointmentOut)
def cancel(
    appointment_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _transition(
        db, request, current_user, appointment_id,
        from_statuses=(AppointmentStatus.SCHEDULED, AppointmentStatus.CHECKED_IN),
        to_status=AppointmentStatus.CANCELLED,
        action="appointments.cancel",
    )


@router.post("/{appointment_id}/no-show", response_model=AppointmentOut)
def no_show(
    appointment_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _transition(
        db, request, current_user, appointment_id,
        from_statuses=(AppointmentStatus.SCHEDULED,),
        to_status=AppointmentStatus.NO_SHOW,
        action="appointments.no_show",
    )
