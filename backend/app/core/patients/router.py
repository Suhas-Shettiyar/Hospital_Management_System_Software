"""Patient registration, search, and update endpoints (core - always on)."""
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.audit.service import record_audit
from app.core.auth.dependencies import get_current_user
from app.core.auth.models import User
from app.core.patients.models import Patient
from app.core.patients.schemas import (
    PatientCreate,
    PatientListItem,
    PatientOut,
    PatientSearchResponse,
    PatientUpdate,
)
from app.core.patients.service import register_patient
from app.database import get_db

router = APIRouter(prefix="/patients", tags=["patients"])


def _client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


@router.post("", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
def create_patient(
    payload: PatientCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.abha_number:
        exists = db.query(Patient).filter(Patient.abha_number == payload.abha_number).first()
        if exists is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "ABHA number already linked to another patient")

    patient = register_patient(db, payload)
    record_audit(
        db,
        actor_user_id=current_user.user_id,
        action="patient.register",
        entity="patient",
        entity_id=str(patient.patient_id),
        ip_address=_client_ip(request),
    )
    db.commit()
    db.refresh(patient)
    return patient


@router.get("", response_model=PatientSearchResponse)
def search_patients(
    q: str | None = Query(default=None, max_length=255),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Patient)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(Patient.name.ilike(like), Patient.phone.ilike(like), Patient.uhid.ilike(like)))

    total = query.count()
    items = query.order_by(Patient.created_at.desc()).offset(offset).limit(limit).all()
    return PatientSearchResponse(items=items, total=total)


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient not found")
    return patient


@router.patch("/{patient_id}", response_model=PatientOut)
def update_patient(
    patient_id: int,
    payload: PatientUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(patient, field, value)

    record_audit(
        db,
        actor_user_id=current_user.user_id,
        action="patient.update",
        entity="patient",
        entity_id=str(patient.patient_id),
        ip_address=_client_ip(request),
    )
    db.commit()
    db.refresh(patient)
    return patient
