"""Request/response models for the appointments/queue endpoints."""
from datetime import datetime

from pydantic import BaseModel, Field

from app.modules.appointments.models import AppointmentStatus


class AppointmentCreateRequest(BaseModel):
    patient_id: int
    doctor_id: int


class AppointmentStatusUpdate(BaseModel):
    status: str = Field(pattern="^(" + "|".join(AppointmentStatus.ALL) + ")$")


class AppointmentOut(BaseModel):
    appointment_id: int
    patient_id: int
    patient_name: str
    patient_uhid: str
    doctor_id: int
    doctor_name: str
    token_no: int
    status: str
    scheduled_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True
