"""OPD (Outpatient/Consultation) department router.

RBAC: registering a patient is a front-desk action (patients:write); opening
or updating a visit is a queue action (queue:write); diagnoses and
prescriptions require clinical write access (consultation:write). Every
write is audited in the same transaction, per app/core/audit/service.py.
"""
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from app.core.audit.service import record_audit
from app.core.auth.dependencies import require
from app.core.auth.models import User
from app.core.opd.models import OpdDiagnosis, OpdPrescription, OpdPrescriptionItem, OpdVisit, OpdVisitStatus
from app.core.patients.models import Patient
from app.core.patients.service import generate_uhid
from app.database import get_db
from app.modules.opd.schemas import (
    DiagnosisCreateRequest,
    DiagnosisOut,
    PatientOut,
    PatientRegisterRequest,
    PatientSearchResult,
    PrescriptionCreateRequest,
    PrescriptionOut,
    VisitCreateRequest,
    VisitOut,
    VisitSummaryOut,
    VisitUpdateRequest,
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


def _get_visit_or_404(db: Session, visit_id: int) -> OpdVisit:
    visit = (
        db.query(OpdVisit)
        .options(
            selectinload(OpdVisit.diagnoses),
            selectinload(OpdVisit.prescriptions).selectinload(OpdPrescription.items),
        )
        .filter(OpdVisit.visit_id == visit_id)
        .first()
    )
    if visit is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Visit not found")
    return visit


# --- Patients ---

@router.get("/patients/search", response_model=list[PatientSearchResult])
def search_patients(
    q: str,
    db: Session = Depends(get_db),
    _user: User = Depends(require("patients:read")),
):
    if len(q.strip()) < 2:
        return []
    term = f"%{q.strip()}%"
    return (
        db.query(Patient)
        .filter(or_(Patient.name.ilike(term), Patient.phone.ilike(term), Patient.uhid.ilike(term)))
        .order_by(Patient.name)
        .limit(20)
        .all()
    )


@router.get("/patients/{patient_id}", response_model=PatientOut)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(require("patients:read")),
):
    """Re-fetches the patient banner for the consultation workspace - needed
    on page refresh, when the router-state patient object from search is
    gone."""
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient not found")
    return patient


@router.post("/patients", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
def register_patient(
    payload: PatientRegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("patients:write")),
):
    # Same two-step insert as core/patients/service.py's register_patient:
    # uhid is NOT NULL + UNIQUE, but generate_uhid() needs patient_id, which
    # only exists after the DB assigns it via flush(). A placeholder
    # satisfies the constraint until then and never survives to commit().
    patient = Patient(
        uhid=f"__pending_{uuid4().hex}",
        name=payload.name,
        dob=payload.dob,
        gender=payload.gender,
        phone=payload.phone,
        address=payload.address,
        blood_group=payload.blood_group,
    )
    db.add(patient)
    db.flush()
    patient.uhid = generate_uhid(patient.patient_id)

    record_audit(
        db,
        actor_user_id=user.user_id,
        action="opd.patient_register",
        entity="patient",
        entity_id=str(patient.patient_id),
        ip_address=_client_ip(request),
    )
    db.commit()
    db.refresh(patient)
    return patient


# --- Visits ---

@router.post("/visits", response_model=VisitOut, status_code=status.HTTP_201_CREATED)
def create_visit(
    payload: VisitCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("queue:write")),
):
    if db.get(Patient, payload.patient_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient not found")

    visit = OpdVisit(
        patient_id=payload.patient_id,
        doctor_id=user.user_id,
        chief_complaint=payload.chief_complaint,
    )
    db.add(visit)
    db.flush()

    record_audit(
        db,
        actor_user_id=user.user_id,
        action="opd.visit_create",
        entity="opd_visit",
        entity_id=str(visit.visit_id),
        ip_address=_client_ip(request),
    )
    db.commit()
    return _get_visit_or_404(db, visit.visit_id)


@router.get("/visits/{visit_id}", response_model=VisitOut)
def get_visit(
    visit_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(require("patients:read")),
):
    return _get_visit_or_404(db, visit_id)


@router.get("/visits", response_model=list[VisitSummaryOut])
def list_visits_for_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(require("patients:read")),
):
    return (
        db.query(OpdVisit)
        .filter(OpdVisit.patient_id == patient_id)
        .order_by(OpdVisit.created_at.desc())
        .all()
    )


@router.patch("/visits/{visit_id}", response_model=VisitOut)
def update_visit(
    visit_id: int,
    payload: VisitUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("queue:write")),
):
    """Save-on-blur target for the chief complaint field, and the generic
    status setter. Status transitions still funnel through /complete for
    the "completed" case so that action stays auditable as its own event."""
    visit = _get_visit_or_404(db, visit_id)

    if payload.chief_complaint is not None:
        visit.chief_complaint = payload.chief_complaint
    if payload.status is not None and payload.status != OpdVisitStatus.COMPLETED:
        visit.status = payload.status

    record_audit(
        db,
        actor_user_id=user.user_id,
        action="opd.visit_update",
        entity="opd_visit",
        entity_id=str(visit.visit_id),
        ip_address=_client_ip(request),
    )
    db.commit()
    return _get_visit_or_404(db, visit_id)


# --- Diagnosis ---

@router.post("/visits/{visit_id}/diagnosis", response_model=DiagnosisOut, status_code=status.HTTP_201_CREATED)
def add_diagnosis(
    visit_id: int,
    payload: DiagnosisCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("consultation:write")),
):
    visit = _get_visit_or_404(db, visit_id)

    diagnosis = OpdDiagnosis(
        visit_id=visit.visit_id,
        icd10_code=payload.icd10_code,
        description=payload.description,
    )
    db.add(diagnosis)
    db.flush()

    record_audit(
        db,
        actor_user_id=user.user_id,
        action="opd.diagnosis_add",
        entity="opd_diagnosis",
        entity_id=str(diagnosis.diagnosis_id),
        ip_address=_client_ip(request),
    )
    db.commit()
    db.refresh(diagnosis)
    return diagnosis


# --- Prescription ---

@router.post("/visits/{visit_id}/prescription", response_model=PrescriptionOut, status_code=status.HTTP_201_CREATED)
def add_prescription(
    visit_id: int,
    payload: PrescriptionCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("consultation:write")),
):
    visit = _get_visit_or_404(db, visit_id)

    prescription = OpdPrescription(visit_id=visit.visit_id)
    db.add(prescription)
    db.flush()

    for item in payload.items:
        db.add(
            OpdPrescriptionItem(
                prescription_id=prescription.prescription_id,
                medicine_name=item.medicine_name,
                dose=item.dose,
                frequency=item.frequency,
                duration=item.duration,
            )
        )
    db.flush()

    record_audit(
        db,
        actor_user_id=user.user_id,
        action="opd.prescription_add",
        entity="opd_prescription",
        entity_id=str(prescription.prescription_id),
        ip_address=_client_ip(request),
    )
    db.commit()

    return (
        db.query(OpdPrescription)
        .options(selectinload(OpdPrescription.items))
        .filter(OpdPrescription.prescription_id == prescription.prescription_id)
        .first()
    )


# --- Complete visit ---

@router.post("/visits/{visit_id}/complete", response_model=VisitOut)
def complete_visit(
    visit_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("consultation:write")),
):
    visit = _get_visit_or_404(db, visit_id)
    visit.status = OpdVisitStatus.COMPLETED

    record_audit(
        db,
        actor_user_id=user.user_id,
        action="opd.visit_complete",
        entity="opd_visit",
        entity_id=str(visit.visit_id),
        ip_address=_client_ip(request),
    )
    db.commit()
    return _get_visit_or_404(db, visit_id)
