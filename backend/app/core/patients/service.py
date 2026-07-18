"""Patient registration logic - specifically UHID generation."""
from datetime import datetime
from uuid import uuid4

from sqlalchemy.orm import Session

from app.core.patients.models import ConsentStatus, Patient
from app.core.patients.schemas import PatientCreate


def generate_uhid(patient_id: int) -> str:
    return f"MED-{datetime.utcnow():%Y}-{patient_id:06d}"


def register_patient(db: Session, payload: PatientCreate) -> Patient:
    """Two-step insert: patient_id is only known after the DB assigns it via
    Postgres's own sequence (flush), so uhid can't be computed up front. A
    throwaway placeholder satisfies the NOT NULL + UNIQUE constraint until
    then - it never survives to commit(). This reuses the same pattern as
    auth's User.user_id, and is race-condition-safe by construction since
    sequence allocation needs no locking, unlike a separate counter table."""
    patient = Patient(
        uhid=f"__pending_{uuid4().hex}",
        name=payload.name,
        dob=payload.dob,
        gender=payload.gender,
        phone=payload.phone,
        address=payload.address,
        blood_group=payload.blood_group,
        abha_number=payload.abha_number,
        abha_address=payload.abha_address,
        consent_status=ConsentStatus.GRANTED if payload.consent_obtained else ConsentStatus.PENDING,
    )
    db.add(patient)
    db.flush()  # assigns patient.patient_id via patients_patient_id_seq
    patient.uhid = generate_uhid(patient.patient_id)
    return patient
