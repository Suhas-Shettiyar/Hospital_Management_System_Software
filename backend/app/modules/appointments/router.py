"""Appointments/Queue: the front-desk waiting-room board, upstream of OPD.

RBAC: queue:read views the board; queue:write creates tokens (check-in) and
advances their status. Every write is audited, per app/core/audit/service.py.
"""
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.audit.service import record_audit
from app.core.auth.dependencies import require
from app.core.auth.models import User
from app.core.patients.models import Patient
from app.database import get_db
from app.modules.appointments.models import Appointment, AppointmentStatus
from app.modules.appointments.schemas import AppointmentCreateRequest, AppointmentOut, AppointmentStatusUpdate

router = APIRouter(prefix="/queue", tags=["appointments"])

MODULE_MANIFEST = {
    "id": "appointments",
    "name": "Appointments & Queue",
    "version": "0.1.0",
    "depends_on": [],
}


def _client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


def _today_bounds() -> tuple[datetime, datetime]:
    start = datetime.combine(date.today(), datetime.min.time())
    return start, start + timedelta(days=1)


def _to_out(db: Session, appt: Appointment) -> AppointmentOut:
    patient = db.get(Patient, appt.patient_id)
    doctor = db.get(User, appt.doctor_id)
    return AppointmentOut(
        appointment_id=appt.appointment_id,
        patient_id=appt.patient_id,
        patient_name=patient.name if patient else "Unknown",
        patient_uhid=patient.uhid if patient else "",
        doctor_id=appt.doctor_id,
        doctor_name=doctor.name if doctor else "Unknown",
        token_no=appt.token_no,
        status=appt.status,
        scheduled_at=appt.scheduled_at,
        created_at=appt.created_at,
    )


@router.get("", response_model=list[AppointmentOut])
def list_queue(
    doctor_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    _user: User = Depends(require("queue:read")),
):
    """Today's queue, optionally filtered by doctor - the board is a
    same-day view, not a historical appointment list."""
    start, end = _today_bounds()
    query = db.query(Appointment).filter(Appointment.scheduled_at >= start, Appointment.scheduled_at < end)
    if doctor_id is not None:
        query = query.filter(Appointment.doctor_id == doctor_id)
    appts = query.order_by(Appointment.token_no).all()
    return [_to_out(db, a) for a in appts]


@router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def create_token(
    payload: AppointmentCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("queue:write")),
):
    if db.get(Patient, payload.patient_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient not found")
    if db.get(User, payload.doctor_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Doctor not found")

    start, end = _today_bounds()
    max_token = (
        db.query(Appointment.token_no)
        .filter(
            Appointment.doctor_id == payload.doctor_id,
            Appointment.scheduled_at >= start,
            Appointment.scheduled_at < end,
        )
        .order_by(Appointment.token_no.desc())
        .first()
    )
    next_token = (max_token[0] + 1) if max_token else 1

    appt = Appointment(patient_id=payload.patient_id, doctor_id=payload.doctor_id, token_no=next_token)
    db.add(appt)
    db.flush()

    record_audit(
        db,
        actor_user_id=user.user_id,
        action="queue.token_create",
        entity="appointment",
        entity_id=str(appt.appointment_id),
        ip_address=_client_ip(request),
    )
    db.commit()
    db.refresh(appt)
    return _to_out(db, appt)


@router.patch("/{appointment_id}/status", response_model=AppointmentOut)
def update_status(
    appointment_id: int,
    payload: AppointmentStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("queue:write")),
):
    appt = db.get(Appointment, appointment_id)
    if appt is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Token not found")

    appt.status = payload.status
    record_audit(
        db,
        actor_user_id=user.user_id,
        action="queue.status_update",
        entity="appointment",
        entity_id=str(appt.appointment_id),
        ip_address=_client_ip(request),
    )
    db.commit()
    db.refresh(appt)
    return _to_out(db, appt)
