"""Only one genuinely new schema is needed here - every read endpoint reuses
the same output schemas the staff-facing routers already return
(ConsultationOut, LabOrderOut, BillOut, AppointmentOut, UserOut, PatientOut),
since a patient's own record has the exact same shape as the staff view of
it. The only difference is which rows the query is scoped to."""
from datetime import datetime

from pydantic import BaseModel, Field


class PortalAppointmentCreate(BaseModel):
    """Same as the staff-facing AppointmentCreate, minus patient_id - the
    portal always books for the logged-in patient, never client-supplied."""

    doctor_id: int
    scheduled_at: datetime
    reason: str | None = Field(default=None, max_length=255)
