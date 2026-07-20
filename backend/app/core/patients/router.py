"""Patient registration, search, and update endpoints (core - always on)."""
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.audit.service import record_audit
from app.core.auth.dependencies import get_current_user
from app.core.auth.email import send_password_reset_email
from app.core.auth.models import AuthTokenPurpose, User, UserRole, UserStatus
from app.core.auth.router import _issue_token
from app.core.auth.security import generate_raw_token, hash_password
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

PASSWORD_RESET_TOKEN_LIFETIME = timedelta(minutes=30)


class GrantPortalAccessRequest(BaseModel):
    email: EmailStr


def _client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


@router.post("", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
def create_patient(
    payload: PatientCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("patients:write")),
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
    current_user: User = Depends(require("patients:read")),
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
    current_user: User = Depends(require("patients:read")),
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
    current_user: User = Depends(require("patients:write")),
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


@router.post("/{patient_id}/grant-portal-access", status_code=status.HTTP_201_CREATED)
def grant_portal_access(
    patient_id: int,
    payload: GrantPortalAccessRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Staff-initiated: creates a role=patient login linked to this clinical
    record and emails a password-reset link so the patient sets their own
    password (reuses the existing, already-shipped password-reset flow -
    real OTP/ABHA login is out of scope, see the Patient Portal plan)."""
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient not found")

    if db.query(User).filter(User.patient_id == patient_id).first() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "This patient already has portal access")
    if db.query(User).filter(User.email == payload.email).first() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    user = User(
        email=payload.email,
        # Random, never communicated - unusable until the patient sets a
        # real password via the password-reset link below.
        hashed_password=hash_password(generate_raw_token()),
        name=patient.name,
        role=UserRole.PATIENT,
        status=UserStatus.ACTIVE,
        is_verified=True,  # staff verified identity in person; skip email verification
        patient_id=patient.patient_id,
    )
    db.add(user)
    db.flush()

    raw_token = _issue_token(db, user, AuthTokenPurpose.PASSWORD_RESET, PASSWORD_RESET_TOKEN_LIFETIME)
    record_audit(
        db,
        actor_user_id=current_user.user_id,
        action="patients.grant_portal_access",
        entity="patient",
        entity_id=str(patient.patient_id),
        ip_address=_client_ip(request),
    )
    db.commit()

    send_password_reset_email(to_email=user.email, name=user.name, raw_token=raw_token)
    return {"detail": "Portal access granted. A password setup email has been sent."}
