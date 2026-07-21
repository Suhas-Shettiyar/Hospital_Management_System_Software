"""IPD (inpatient) models: wards, beds, admissions, bed history, and vitals.

Bed history is tracked via a dedicated BedAssignment table, not a single
"current bed" field on Admission - a patient can move beds mid-stay, and
different wards can have different daily rates, so room charges must be
computed per assignment period (see service.py), not one flat rate for the
whole stay. VitalsRecord is append-only, no edit/delete - same "no amend"
philosophy as every other clinical record in this codebase.
"""
from datetime import datetime

from sqlalchemy import Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class WardType:
    GENERAL = "general"
    ICU = "icu"
    PRIVATE = "private"
    SEMI_PRIVATE = "semi_private"

    ALL = (GENERAL, ICU, PRIVATE, SEMI_PRIVATE)


class BedStatus:
    VACANT = "vacant"
    OCCUPIED = "occupied"
    MAINTENANCE = "maintenance"

    ALL = (VACANT, OCCUPIED, MAINTENANCE)


class AdmissionStatus:
    ADMITTED = "admitted"
    DISCHARGED = "discharged"

    ALL = (ADMITTED, DISCHARGED)


class Ward(Base):
    __tablename__ = "ipd_wards"

    ward_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    ward_type: Mapped[str] = mapped_column(
        Enum(*WardType.ALL, name="ipd_ward_type", native_enum=False, validate_strings=True),
        nullable=False,
    )
    daily_rate: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    beds: Mapped[list["Bed"]] = relationship(back_populates="ward", order_by="Bed.bed_number")


class Bed(Base):
    __tablename__ = "ipd_beds"

    bed_id: Mapped[int] = mapped_column(primary_key=True)
    ward_id: Mapped[int] = mapped_column(ForeignKey("ipd_wards.ward_id"), nullable=False, index=True)
    bed_number: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(
        Enum(*BedStatus.ALL, name="ipd_bed_status", native_enum=False, validate_strings=True),
        nullable=False,
        default=BedStatus.VACANT,
        server_default=BedStatus.VACANT,
    )
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    ward: Mapped["Ward"] = relationship(back_populates="beds")


class Admission(Base):
    __tablename__ = "ipd_admissions"

    admission_id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.patient_id"), nullable=False, index=True)
    # Optional traceability into OPD - same nullable-FK pattern as
    # lab_orders.consult_id/pharmacy_dispenses.prescription_id. An admission
    # can start from a walk-in/emergency with no prior consultation.
    consult_id: Mapped[int | None] = mapped_column(ForeignKey("opd_consultations.consult_id"), index=True)
    admitting_doctor_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False, index=True)
    admission_reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        Enum(*AdmissionStatus.ALL, name="ipd_admission_status", native_enum=False, validate_strings=True),
        nullable=False,
        default=AdmissionStatus.ADMITTED,
        server_default=AdmissionStatus.ADMITTED,
    )
    admitted_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    discharged_at: Mapped[datetime | None] = mapped_column()
    discharge_summary: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)

    bed_assignments: Mapped[list["BedAssignment"]] = relationship(
        back_populates="admission", order_by="BedAssignment.assigned_at"
    )
    vitals: Mapped[list["VitalsRecord"]] = relationship(
        back_populates="admission", order_by="VitalsRecord.recorded_at"
    )


class BedAssignment(Base):
    """One row per bed the patient occupied during this admission -
    released_at is null exactly when this is the currently active bed."""

    __tablename__ = "ipd_bed_assignments"

    assignment_id: Mapped[int] = mapped_column(primary_key=True)
    admission_id: Mapped[int] = mapped_column(ForeignKey("ipd_admissions.admission_id"), nullable=False, index=True)
    bed_id: Mapped[int] = mapped_column(ForeignKey("ipd_beds.bed_id"), nullable=False, index=True)
    assigned_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    released_at: Mapped[datetime | None] = mapped_column()

    admission: Mapped["Admission"] = relationship(back_populates="bed_assignments")
    bed: Mapped["Bed"] = relationship()

    @property
    def bed_number(self) -> str:
        """Convenience for BedAssignmentOut's from_attributes serialization -
        callers must eager-load .bed (and .bed.ward) to avoid an N+1."""
        return self.bed.bed_number

    @property
    def ward_name(self) -> str:
        return self.bed.ward.name


class VitalsRecord(Base):
    __tablename__ = "ipd_vitals_records"

    record_id: Mapped[int] = mapped_column(primary_key=True)
    admission_id: Mapped[int] = mapped_column(ForeignKey("ipd_admissions.admission_id"), nullable=False, index=True)
    recorded_by: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    temperature_celsius: Mapped[float | None] = mapped_column(Numeric(4, 1))
    pulse_bpm: Mapped[int | None] = mapped_column()
    bp_systolic: Mapped[int | None] = mapped_column()
    bp_diastolic: Mapped[int | None] = mapped_column()
    spo2_percent: Mapped[int | None] = mapped_column()
    notes: Mapped[str | None] = mapped_column(Text)

    admission: Mapped["Admission"] = relationship(back_populates="vitals")
