"""Request/response models for the IPD ward/bed/admission endpoints."""
from datetime import datetime

from pydantic import BaseModel, Field


class WardCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    ward_type: str
    daily_rate: float = Field(ge=0)


class WardOut(BaseModel):
    ward_id: int
    name: str
    ward_type: str
    daily_rate: float
    created_at: datetime

    class Config:
        from_attributes = True


class BedCreate(BaseModel):
    bed_number: str = Field(min_length=1, max_length=20)


class BedBoardItem(BaseModel):
    """The Ward Board's data source - one row per bed, with the ward it
    belongs to and (if occupied) who's currently in it."""

    bed_id: int
    bed_number: str
    status: str
    ward_id: int
    ward_name: str
    ward_type: str
    admission_id: int | None
    patient_id: int | None
    patient_name: str | None


class BedAssignmentOut(BaseModel):
    assignment_id: int
    bed_id: int
    bed_number: str
    ward_name: str
    assigned_at: datetime
    released_at: datetime | None

    class Config:
        from_attributes = True


class VitalsRecordCreate(BaseModel):
    temperature_celsius: float | None = None
    pulse_bpm: int | None = None
    bp_systolic: int | None = None
    bp_diastolic: int | None = None
    spo2_percent: int | None = None
    notes: str | None = Field(default=None, max_length=1000)


class VitalsRecordOut(BaseModel):
    record_id: int
    recorded_by: int
    recorded_at: datetime
    temperature_celsius: float | None
    pulse_bpm: int | None
    bp_systolic: int | None
    bp_diastolic: int | None
    spo2_percent: int | None
    notes: str | None

    class Config:
        from_attributes = True


class AdmissionCreate(BaseModel):
    patient_id: int
    bed_id: int
    admitting_doctor_id: int
    admission_reason: str = Field(min_length=1, max_length=2000)
    consult_id: int | None = None


class AdmissionOut(BaseModel):
    admission_id: int
    patient_id: int
    consult_id: int | None
    admitting_doctor_id: int
    admission_reason: str
    status: str
    admitted_at: datetime
    discharged_at: datetime | None
    discharge_summary: str | None
    bed_assignments: list[BedAssignmentOut]
    vitals: list[VitalsRecordOut]

    class Config:
        from_attributes = True


class AdmissionListItem(BaseModel):
    admission_id: int
    patient_id: int
    status: str
    admitted_at: datetime
    discharged_at: datetime | None

    class Config:
        from_attributes = True


class AdmissionSearchResponse(BaseModel):
    items: list[AdmissionListItem]
    total: int


class MoveBedRequest(BaseModel):
    new_bed_id: int


class DischargeRequest(BaseModel):
    discharge_summary: str = Field(min_length=1, max_length=5000)
