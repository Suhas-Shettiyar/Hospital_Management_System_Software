"""OPD consultation endpoints - a real toggleable department package."""
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session, selectinload

from app.core.audit.service import record_audit
from app.core.auth.dependencies import get_current_user
from app.core.auth.models import User
from app.core.patients.models import Patient
from app.database import get_db
from app.modules.opd.models import Consultation, Prescription, PrescriptionItem
from app.modules.opd.schemas import (
    ConsultationCreate,
    ConsultationListItem,
    ConsultationOut,
    ConsultationSearchResponse,
)

router = APIRouter(prefix="/opd", tags=["opd"])

MODULE_MANIFEST = {
    "id": "opd",
    "name": "Outpatient Department",
    "version": "0.1.0",
    "depends_on": [],
}


def _client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


@router.post("/consultations", response_model=ConsultationOut, status_code=status.HTTP_201_CREATED)
def create_consultation(
    payload: ConsultationCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if db.get(Patient, payload.patient_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient not found")

    consult = Consultation(
        patient_id=payload.patient_id,
        doctor_id=current_user.user_id,
        chief_complaint=payload.chief_complaint,
        diagnosis_code=payload.diagnosis_code,
        diagnosis_text=payload.diagnosis_text,
        notes=payload.notes,
    )
    db.add(consult)
    db.flush()  # assigns consult.consult_id, same two-step pattern as register_patient()

    if payload.items:
        rx = Prescription(consult_id=consult.consult_id, instructions=payload.prescription_instructions)
        rx.items = [PrescriptionItem(**item.model_dump()) for item in payload.items]
        db.add(rx)

    record_audit(
        db,
        actor_user_id=current_user.user_id,
        action="opd.consultation.create",
        entity="consultation",
        entity_id=str(consult.consult_id),
        ip_address=_client_ip(request),
    )
    db.commit()
    db.refresh(consult)
    return consult


@router.get("/consultations", response_model=ConsultationSearchResponse)
def list_consultations(
    patient_id: int | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Consultation)
    if patient_id is not None:
        query = query.filter(Consultation.patient_id == patient_id)

    total = query.count()
    rows = query.order_by(Consultation.created_at.desc()).offset(offset).limit(limit).all()
    items = [
        ConsultationListItem(
            consult_id=c.consult_id,
            patient_id=c.patient_id,
            doctor_id=c.doctor_id,
            diagnosis_text=c.diagnosis_text,
            consult_date=c.consult_date,
            has_prescription=c.prescription is not None,
        )
        for c in rows
    ]
    return ConsultationSearchResponse(items=items, total=total)


@router.get("/consultations/{consult_id}", response_model=ConsultationOut)
def get_consultation(
    consult_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    consult = (
        db.query(Consultation)
        .options(selectinload(Consultation.prescription).selectinload(Prescription.items))
        .filter(Consultation.consult_id == consult_id)
        .first()
    )
    if consult is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Consultation not found")
    return consult
