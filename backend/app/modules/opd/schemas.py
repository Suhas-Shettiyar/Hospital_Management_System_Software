"""Request/response models for the OPD endpoints."""
import re
from datetime import date, datetime

from pydantic import BaseModel, Field

from app.core.patients.models import BloodGroup, Gender


def _choice_pattern(choices: tuple[str, ...]) -> str:
    """Values like blood groups ('A+', 'B-') contain regex metacharacters -
    escape each choice before joining, or the pattern silently breaks."""
    return "^(" + "|".join(re.escape(c) for c in choices) + ")$"


# --- Patients (OPD is the first real consumer of patient registration) ---

class PatientSearchResult(BaseModel):
    patient_id: int
    uhid: str
    name: str
    phone: str
    dob: date
    gender: str

    class Config:
        from_attributes = True


class PatientRegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    dob: date
    gender: str = Field(pattern=_choice_pattern(Gender.ALL))
    phone: str = Field(min_length=6, max_length=20)
    address: str | None = Field(default=None, max_length=500)
    blood_group: str | None = Field(default=None, pattern=_choice_pattern(BloodGroup.ALL))


class PatientOut(BaseModel):
    patient_id: int
    uhid: str
    name: str
    dob: date
    gender: str
    phone: str
    address: str | None
    blood_group: str | None

    class Config:
        from_attributes = True


# --- Visits ---

class VisitCreateRequest(BaseModel):
    patient_id: int
    chief_complaint: str | None = Field(default=None, max_length=4000)


class VisitUpdateRequest(BaseModel):
    chief_complaint: str | None = Field(default=None, max_length=4000)
    status: str | None = None


class DiagnosisOut(BaseModel):
    diagnosis_id: int
    icd10_code: str | None
    description: str
    created_at: datetime

    class Config:
        from_attributes = True


class PrescriptionItemIn(BaseModel):
    medicine_name: str = Field(min_length=1, max_length=255)
    dose: str | None = Field(default=None, max_length=100)
    frequency: str | None = Field(default=None, max_length=100)
    duration: str | None = Field(default=None, max_length=100)


class PrescriptionItemOut(PrescriptionItemIn):
    item_id: int

    class Config:
        from_attributes = True


class PrescriptionOut(BaseModel):
    prescription_id: int
    created_at: datetime
    items: list[PrescriptionItemOut]

    class Config:
        from_attributes = True


class DiagnosisCreateRequest(BaseModel):
    icd10_code: str | None = Field(default=None, max_length=20)
    description: str = Field(min_length=1, max_length=4000)


class PrescriptionCreateRequest(BaseModel):
    items: list[PrescriptionItemIn] = Field(min_length=1)


class VisitOut(BaseModel):
    visit_id: int
    patient_id: int
    doctor_id: int
    chief_complaint: str | None
    status: str
    created_at: datetime
    updated_at: datetime | None
    diagnoses: list[DiagnosisOut]
    prescriptions: list[PrescriptionOut]

    class Config:
        from_attributes = True


class VisitSummaryOut(BaseModel):
    """Lightweight shape for visit-history lists (no nested diagnosis/rx)."""

    visit_id: int
    chief_complaint: str | None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
