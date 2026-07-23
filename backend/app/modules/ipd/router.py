"""IPD ward/bed/admission endpoints - a real toggleable department package."""
import math
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session, selectinload

from app.core.audit.service import record_audit
from app.core.auth.dependencies import require
from app.core.auth.models import User, UserRole, UserStatus
from app.core.auth.schemas import UserOut
from app.core.billing_engine.models import Bill, BillItem
from app.core.billing_engine.schemas import BillOut
from app.core.patients.models import Patient
from app.database import get_db
from app.modules.ipd.models import Admission, AdmissionStatus, Bed, BedAssignment, BedStatus, VitalsRecord, Ward
from app.modules.ipd.schemas import (
    AdmissionCreate,
    AdmissionOut,
    AdmissionSearchResponse,
    BedBoardItem,
    BedCreate,
    DischargeRequest,
    MoveBedRequest,
    VitalsRecordCreate,
    WardCreate,
    WardOut,
)
from app.modules.opd.models import Consultation

router = APIRouter(prefix="/ipd", tags=["ipd"])

MODULE_MANIFEST = {
    "id": "ipd",
    "name": "Inpatient (IPD)",
    "version": "0.1.0",
    "depends_on": [],
}


def _client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


def _admission_with_relations(db: Session):
    return db.query(Admission).options(
        selectinload(Admission.bed_assignments).selectinload(BedAssignment.bed).selectinload(Bed.ward),
        selectinload(Admission.vitals),
    )


def _current_bed_assignment(admission: Admission) -> BedAssignment | None:
    return next((a for a in admission.bed_assignments if a.released_at is None), None)


@router.post("/wards", response_model=WardOut, status_code=status.HTTP_201_CREATED)
def create_ward(
    payload: WardCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("ipd:write")),
):
    if db.query(Ward).filter(Ward.name == payload.name).first() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "A ward with this name already exists")

    ward = Ward(name=payload.name, ward_type=payload.ward_type, daily_rate=payload.daily_rate)
    db.add(ward)
    db.flush()

    record_audit(
        db, actor_user_id=current_user.user_id, action="ipd.ward.create",
        entity="ipd_ward", entity_id=str(ward.ward_id), ip_address=_client_ip(request),
    )
    db.commit()
    db.refresh(ward)
    return ward


@router.get("/wards", response_model=list[WardOut])
def list_wards(
    db: Session = Depends(get_db),
    current_user: User = Depends(require("ipd:read")),
):
    return db.query(Ward).order_by(Ward.name).all()


@router.post("/wards/{ward_id}/beds", response_model=BedBoardItem, status_code=status.HTTP_201_CREATED)
def create_bed(
    ward_id: int,
    payload: BedCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("ipd:write")),
):
    ward = db.get(Ward, ward_id)
    if ward is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ward not found")

    bed = Bed(ward_id=ward_id, bed_number=payload.bed_number)
    db.add(bed)
    db.flush()

    record_audit(
        db, actor_user_id=current_user.user_id, action="ipd.bed.create",
        entity="ipd_bed", entity_id=str(bed.bed_id), ip_address=_client_ip(request),
    )
    db.commit()
    return BedBoardItem(
        bed_id=bed.bed_id, bed_number=bed.bed_number, status=bed.status,
        ward_id=ward.ward_id, ward_name=ward.name, ward_type=ward.ward_type,
        admission_id=None, patient_id=None, patient_name=None,
    )


@router.get("/beds", response_model=list[BedBoardItem])
def list_beds(
    db: Session = Depends(get_db),
    current_user: User = Depends(require("ipd:read")),
):
    beds = db.query(Bed).options(selectinload(Bed.ward)).order_by(Bed.ward_id, Bed.bed_number).all()

    # For occupied beds, look up the active assignment -> admission -> patient
    # in one query rather than N+1-ing per bed.
    active_assignments = (
        db.query(BedAssignment)
        .options(selectinload(BedAssignment.admission))
        .filter(BedAssignment.released_at.is_(None))
        .all()
    )
    by_bed_id = {a.bed_id: a for a in active_assignments}
    patient_ids = [a.admission.patient_id for a in active_assignments]
    patients_by_id = {p.patient_id: p for p in db.query(Patient).filter(Patient.patient_id.in_(patient_ids)).all()}

    items = []
    for bed in beds:
        assignment = by_bed_id.get(bed.bed_id)
        admission = assignment.admission if assignment else None
        patient = patients_by_id.get(admission.patient_id) if admission else None
        items.append(
            BedBoardItem(
                bed_id=bed.bed_id, bed_number=bed.bed_number, status=bed.status,
                ward_id=bed.ward_id, ward_name=bed.ward.name, ward_type=bed.ward.ward_type,
                admission_id=admission.admission_id if admission else None,
                patient_id=admission.patient_id if admission else None,
                patient_name=patient.name if patient else None,
            )
        )
    return items


@router.get("/doctors", response_model=list[UserOut])
def list_doctors(
    db: Session = Depends(get_db),
    current_user: User = Depends(require("ipd:read")),
):
    return (
        db.query(User)
        .filter(User.role == UserRole.DOCTOR, User.status == UserStatus.ACTIVE)
        .order_by(User.name)
        .all()
    )


@router.post("/admissions", response_model=AdmissionOut, status_code=status.HTTP_201_CREATED)
def admit_patient(
    payload: AdmissionCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("ipd:write")),
):
    if db.get(Patient, payload.patient_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient not found")

    doctor = db.get(User, payload.admitting_doctor_id)
    if doctor is None or doctor.role != UserRole.DOCTOR:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Doctor not found")

    if payload.consult_id is not None:
        consult = db.get(Consultation, payload.consult_id)
        if consult is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Consultation not found")
        if consult.patient_id != payload.patient_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Consultation does not belong to this patient")

    bed = db.get(Bed, payload.bed_id)
    if bed is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Bed not found")
    if bed.status != BedStatus.VACANT:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Bed is not vacant (status: {bed.status})")

    admission = Admission(
        patient_id=payload.patient_id,
        consult_id=payload.consult_id,
        admitting_doctor_id=payload.admitting_doctor_id,
        admission_reason=payload.admission_reason,
        created_by=current_user.user_id,
    )
    db.add(admission)
    db.flush()

    db.add(BedAssignment(admission_id=admission.admission_id, bed_id=bed.bed_id))
    bed.status = BedStatus.OCCUPIED

    record_audit(
        db, actor_user_id=current_user.user_id, action="ipd.admission.create",
        entity="ipd_admission", entity_id=str(admission.admission_id), ip_address=_client_ip(request),
    )
    db.commit()
    return _admission_with_relations(db).filter(Admission.admission_id == admission.admission_id).first()


@router.get("/admissions", response_model=AdmissionSearchResponse)
def list_admissions(
    patient_id: int | None = Query(default=None),
    status_: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require("ipd:read")),
):
    query = db.query(Admission)
    if patient_id is not None:
        query = query.filter(Admission.patient_id == patient_id)
    if status_ is not None:
        query = query.filter(Admission.status == status_)

    total = query.count()
    items = query.order_by(Admission.admitted_at.desc()).offset(offset).limit(limit).all()
    return AdmissionSearchResponse(items=items, total=total)


@router.get("/admissions/{admission_id}", response_model=AdmissionOut)
def get_admission(
    admission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("ipd:read")),
):
    admission = _admission_with_relations(db).filter(Admission.admission_id == admission_id).first()
    if admission is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Admission not found")
    return admission


@router.post("/admissions/{admission_id}/move-bed", response_model=AdmissionOut)
def move_bed(
    admission_id: int,
    payload: MoveBedRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("ipd:write")),
):
    admission = _admission_with_relations(db).filter(Admission.admission_id == admission_id).first()
    if admission is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Admission not found")
    if admission.status != AdmissionStatus.ADMITTED:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Cannot move bed for an admission with status '{admission.status}'")

    new_bed = db.get(Bed, payload.new_bed_id)
    if new_bed is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Bed not found")
    if new_bed.status != BedStatus.VACANT:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Bed is not vacant (status: {new_bed.status})")

    current_assignment = _current_bed_assignment(admission)
    if current_assignment is not None:
        current_assignment.released_at = datetime.utcnow()
        current_assignment.bed.status = BedStatus.VACANT

    db.add(BedAssignment(admission_id=admission.admission_id, bed_id=new_bed.bed_id))
    new_bed.status = BedStatus.OCCUPIED

    record_audit(
        db, actor_user_id=current_user.user_id, action="ipd.move_bed",
        entity="ipd_admission", entity_id=str(admission.admission_id), ip_address=_client_ip(request),
    )
    db.commit()
    return _admission_with_relations(db).filter(Admission.admission_id == admission_id).first()


@router.post("/admissions/{admission_id}/vitals", response_model=AdmissionOut, status_code=status.HTTP_201_CREATED)
def record_vitals(
    admission_id: int,
    payload: VitalsRecordCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("vitals:write")),
):
    admission = db.get(Admission, admission_id)
    if admission is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Admission not found")
    if admission.status != AdmissionStatus.ADMITTED:
        raise HTTPException(status.HTTP_409_CONFLICT, "Cannot record vitals for a discharged admission")

    db.add(
        VitalsRecord(
            admission_id=admission.admission_id,
            recorded_by=current_user.user_id,
            **payload.model_dump(),
        )
    )

    record_audit(
        db, actor_user_id=current_user.user_id, action="ipd.vitals.record",
        entity="ipd_admission", entity_id=str(admission.admission_id), ip_address=_client_ip(request),
    )
    db.commit()
    return _admission_with_relations(db).filter(Admission.admission_id == admission_id).first()


@router.post("/admissions/{admission_id}/generate-charges", response_model=BillOut, status_code=status.HTTP_201_CREATED)
def generate_room_charges(
    admission_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("ipd:write")),
):
    admission = _admission_with_relations(db).filter(Admission.admission_id == admission_id).first()
    if admission is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Admission not found")
    if not admission.bed_assignments:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No bed assignments to charge for")

    bill = Bill(patient_id=admission.patient_id, created_by=current_user.user_id)
    db.add(bill)
    db.flush()

    now = datetime.utcnow()
    for assignment in admission.bed_assignments:
        end = assignment.released_at or now
        days = max(1, math.ceil((end - assignment.assigned_at).total_seconds() / 86400))
        rate = float(assignment.bed.ward.daily_rate)
        subtotal = days * rate
        item = BillItem(
            bill_id=bill.bill_id,
            description=f"Room charges - {assignment.bed.ward.name} (Bed {assignment.bed.bed_number}), {days} day(s)",
            quantity=days,
            unit_price=rate,
            gst_rate=0,
            subtotal=subtotal,
            gst_amount=0,
            line_total=subtotal,
        )
        db.add(item)
        bill.items.append(item)

    bill.total = sum((item.line_total for item in bill.items), start=0.0)

    record_audit(
        db, actor_user_id=current_user.user_id, action="ipd.generate_charges",
        entity="ipd_admission", entity_id=str(admission.admission_id), ip_address=_client_ip(request),
    )
    db.commit()
    return (
        db.query(Bill)
        .options(selectinload(Bill.items), selectinload(Bill.payments))
        .filter(Bill.bill_id == bill.bill_id)
        .first()
    )


@router.post("/admissions/{admission_id}/discharge", response_model=AdmissionOut)
def discharge_patient(
    admission_id: int,
    payload: DischargeRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("ipd:write")),
):
    admission = _admission_with_relations(db).filter(Admission.admission_id == admission_id).first()
    if admission is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Admission not found")
    if admission.status != AdmissionStatus.ADMITTED:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Cannot discharge an admission with status '{admission.status}'")

    current_assignment = _current_bed_assignment(admission)
    if current_assignment is not None:
        current_assignment.released_at = datetime.utcnow()
        current_assignment.bed.status = BedStatus.VACANT

    admission.status = AdmissionStatus.DISCHARGED
    admission.discharged_at = datetime.utcnow()
    admission.discharge_summary = payload.discharge_summary

    record_audit(
        db, actor_user_id=current_user.user_id, action="ipd.discharge",
        entity="ipd_admission", entity_id=str(admission.admission_id), ip_address=_client_ip(request),
    )
    db.commit()
    return _admission_with_relations(db).filter(Admission.admission_id == admission_id).first()
