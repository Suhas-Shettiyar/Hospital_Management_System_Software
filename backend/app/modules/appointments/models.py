"""Appointments/Queue: the front-desk waiting-room board, upstream of OPD.

A patient checks in and gets a token; the token progresses waiting ->
in_consult -> done. This is deliberately decoupled from OpdVisit (see
router.py) - calling a token forward doesn't create or touch a visit, and
starting a visit doesn't require a token. They're related workflows, not one
mechanism.
"""
from datetime import datetime

from sqlalchemy import Enum, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AppointmentStatus:
    WAITING = "waiting"
    IN_CONSULT = "in_consult"
    DONE = "done"

    ALL = (WAITING, IN_CONSULT, DONE)


class Appointment(Base):
    __tablename__ = "appointments"

    appointment_id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.patient_id"), nullable=False, index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False, index=True)
    token_no: Mapped[int] = mapped_column(nullable=False)
    status: Mapped[str] = mapped_column(
        Enum(*AppointmentStatus.ALL, name="appointment_status", native_enum=False, validate_strings=True),
        nullable=False,
        default=AppointmentStatus.WAITING,
        server_default=AppointmentStatus.WAITING,
    )
    scheduled_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
