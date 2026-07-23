"""Request/response models for the patient endpoints."""
from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator

from app.core.patients.models import BloodGroup, ConsentStatus, Gender


class PatientCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    dob: date
    gender: str = Field(pattern="^(" + "|".join(Gender.ALL) + ")$")
    phone: str = Field(min_length=6, max_length=20)
    address: str | None = Field(default=None, max_length=500)
    blood_group: str | None = Field(default=None, pattern="^(" + "|".join(BloodGroup.ALL) + ")$")
    abha_number: str | None = Field(default=None, max_length=50)
    abha_address: str | None = Field(default=None, max_length=255)
    consent_obtained: bool = False

    @field_validator("dob")
    @classmethod
    def not_future(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("dob cannot be in the future")
        return v


class PatientUpdate(BaseModel):
    """All fields optional - partial update. uhid is deliberately absent:
    it's a permanent identifier once issued (may already be on printed ID
    cards, bills, visit records), so it's never editable."""
    name: str | None = Field(default=None, min_length=1, max_length=255)
    dob: date | None = None
    gender: str | None = Field(default=None, pattern="^(" + "|".join(Gender.ALL) + ")$")
    phone: str | None = Field(default=None, min_length=6, max_length=20)
    address: str | None = Field(default=None, max_length=500)
    blood_group: str | None = Field(default=None, pattern="^(" + "|".join(BloodGroup.ALL) + ")$")
    abha_number: str | None = Field(default=None, max_length=50)
    abha_address: str | None = Field(default=None, max_length=255)
    consent_status: str | None = Field(default=None, pattern="^(" + "|".join(ConsentStatus.ALL) + ")$")


class PatientOut(BaseModel):
    patient_id: int
    uhid: str
    abha_number: str | None
    abha_address: str | None
    name: str
    dob: date
    gender: str
    phone: str
    address: str | None
    blood_group: str | None
    consent_status: str
    created_at: datetime

    class Config:
        from_attributes = True


class PatientListItem(BaseModel):
    """Lighter shape for search results / list table - skips address/ABHA
    fields not needed for a row a clerk is just scanning."""
    patient_id: int
    uhid: str
    name: str
    gender: str
    dob: date
    phone: str
    consent_status: str

    class Config:
        from_attributes = True


class PatientSearchResponse(BaseModel):
    items: list[PatientListItem]
    total: int
