"""Request/response models for the OPD consultation endpoints."""
from datetime import date, datetime

from pydantic import BaseModel, Field


class PrescriptionItemIn(BaseModel):
    med_name: str = Field(min_length=1, max_length=255)
    dose: str = Field(min_length=1, max_length=100)
    frequency: str = Field(min_length=1, max_length=100)
    duration: str = Field(min_length=1, max_length=100)


class PrescriptionItemOut(BaseModel):
    item_id: int
    med_name: str
    dose: str
    frequency: str
    duration: str

    class Config:
        from_attributes = True


class PrescriptionOut(BaseModel):
    rx_id: int
    instructions: str | None
    items: list[PrescriptionItemOut]

    class Config:
        from_attributes = True


class ConsultationCreate(BaseModel):
    patient_id: int
    chief_complaint: str = Field(min_length=1, max_length=500)
    diagnosis_code: str | None = Field(default=None, max_length=20)
    diagnosis_text: str = Field(min_length=1, max_length=500)
    notes: str | None = None
    prescription_instructions: str | None = None
    # Empty by default: a consultation is "advice only" unless at least one
    # medicine is added - no empty placeholder Prescription row is ever
    # created for an empty list (see router.py).
    items: list[PrescriptionItemIn] = Field(default_factory=list)


class ConsultationOut(BaseModel):
    consult_id: int
    patient_id: int
    doctor_id: int
    chief_complaint: str
    diagnosis_code: str | None
    diagnosis_text: str
    notes: str | None
    consult_date: date
    created_at: datetime
    prescription: PrescriptionOut | None

    class Config:
        from_attributes = True


class ConsultationListItem(BaseModel):
    consult_id: int
    patient_id: int
    doctor_id: int
    diagnosis_text: str
    consult_date: date
    has_prescription: bool

    class Config:
        from_attributes = True


class ConsultationSearchResponse(BaseModel):
    items: list[ConsultationListItem]
    total: int
