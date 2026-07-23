"""OPD (outpatient/consultation) records: visits, diagnoses, prescriptions.

Foreign keys point at the core's shared patients/users tables so every
department sees the same unified patient and staff identity (per the
Technical Roadmap's "single PostgreSQL database, one schema per package,
core patients shared" design).
"""
from datetime import datetime

from sqlalchemy import Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class OpdVisitStatus:
    OPEN = "open"
    COMPLETED = "completed"

    ALL = (OPEN, COMPLETED)


class OpdVisit(Base):
    __tablename__ = "opd_visits"

    visit_id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.patient_id"), nullable=False, index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False, index=True)
    chief_complaint: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(
        Enum(*OpdVisitStatus.ALL, name="opd_visit_status", native_enum=False, validate_strings=True),
        nullable=False,
        default=OpdVisitStatus.OPEN,
        server_default=OpdVisitStatus.OPEN,
    )
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(onupdate=func.now())

    diagnoses: Mapped[list["OpdDiagnosis"]] = relationship(back_populates="visit", order_by="OpdDiagnosis.created_at")
    prescriptions: Mapped[list["OpdPrescription"]] = relationship(back_populates="visit", order_by="OpdPrescription.created_at")


class OpdDiagnosis(Base):
    """A visit's diagnosis. icd10_code is free-text for now (no ICD-10
    lookup table exists yet) - matches FR-OPD-2's "diagnosis with ICD-10
    codes" while keeping the MVP simple; a real coded lookup is a documented
    follow-up, not a blocker."""

    __tablename__ = "opd_diagnoses"

    diagnosis_id: Mapped[int] = mapped_column(primary_key=True)
    visit_id: Mapped[int] = mapped_column(ForeignKey("opd_visits.visit_id"), nullable=False, index=True)
    icd10_code: Mapped[str | None] = mapped_column(String(20))
    description: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    visit: Mapped["OpdVisit"] = relationship(back_populates="diagnoses")


class OpdPrescription(Base):
    __tablename__ = "opd_prescriptions"

    prescription_id: Mapped[int] = mapped_column(primary_key=True)
    visit_id: Mapped[int] = mapped_column(ForeignKey("opd_visits.visit_id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    visit: Mapped["OpdVisit"] = relationship(back_populates="prescriptions")
    items: Mapped[list["OpdPrescriptionItem"]] = relationship(
        back_populates="prescription", order_by="OpdPrescriptionItem.item_id", cascade="all, delete-orphan"
    )


class OpdPrescriptionItem(Base):
    """One medicine line. medicine_name is plain text - there's no pharmacy
    medicine master yet (that's FR-PHARM-1, a later phase); structured
    dose/frequency/duration still satisfies FR-OPD-3's "structured medicine,
    dose, frequency, duration" requirement."""

    __tablename__ = "opd_prescription_items"

    item_id: Mapped[int] = mapped_column(primary_key=True)
    prescription_id: Mapped[int] = mapped_column(ForeignKey("opd_prescriptions.prescription_id"), nullable=False, index=True)
    medicine_name: Mapped[str] = mapped_column(String(255), nullable=False)
    dose: Mapped[str | None] = mapped_column(String(100))
    frequency: Mapped[str | None] = mapped_column(String(100))
    duration: Mapped[str | None] = mapped_column(String(100))

    prescription: Mapped["OpdPrescription"] = relationship(back_populates="items")
