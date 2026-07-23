"""Appointments & Queue: booking and front-desk check-in/queue tracking.

Deliberately self-contained - no FK into opd_consultations, unlike Lab's
consult_id or Pharmacy's prescription_id. Every other department package's
optional FK points INTO OPD, never the reverse; OPD itself has never been
modified to know about another package. Completing an appointment is a
manual front-desk action, not an automatic side effect of a consultation
being created elsewhere - see the plan notes for why that link is out of
scope here.
"""
from datetime import datetime

from sqlalchemy import Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AppointmentStatus:
    SCHEDULED = "scheduled"
    CHECKED_IN = "checked_in"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

    ALL = (SCHEDULED, CHECKED_IN, COMPLETED, CANCELLED, NO_SHOW)


class Appointment(Base):
    __tablename__ = "appointments"

    appointment_id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.patient_id"), nullable=False, index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False, index=True)
    scheduled_at: Mapped[datetime] = mapped_column(nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        Enum(*AppointmentStatus.ALL, name="appointment_status", native_enum=False, validate_strings=True),
        nullable=False,
        default=AppointmentStatus.SCHEDULED,
        server_default=AppointmentStatus.SCHEDULED,
    )
    reason: Mapped[str | None] = mapped_column(String(255))
    checked_in_at: Mapped[datetime | None] = mapped_column()
    created_by: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
