"""Request/response models for the Appointments booking/queue endpoints."""
from datetime import datetime

from pydantic import BaseModel, Field


class AppointmentCreate(BaseModel):
    patient_id: int
    doctor_id: int
    scheduled_at: datetime
    reason: str | None = Field(default=None, max_length=255)


class AppointmentOut(BaseModel):
    appointment_id: int
    patient_id: int
    doctor_id: int
    scheduled_at: datetime
    status: str
    reason: str | None
    checked_in_at: datetime | None
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True


class AppointmentListItem(BaseModel):
    appointment_id: int
    patient_id: int
    doctor_id: int
    scheduled_at: datetime
    status: str
    reason: str | None
    checked_in_at: datetime | None

    class Config:
        from_attributes = True


class AppointmentSearchResponse(BaseModel):
    items: list[AppointmentListItem]
    total: int
