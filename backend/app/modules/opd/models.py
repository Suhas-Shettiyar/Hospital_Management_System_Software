"""OPD clinical models: consultations and their prescriptions.

Append-only by design (no updated_at anywhere, no PATCH/DELETE routes) - a
consultation documents what a doctor observed/decided at a point in time.
Correcting a mistake means creating a new consultation, not editing history.
"""
from datetime import date, datetime

from sqlalchemy import Date, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Consultation(Base):
    __tablename__ = "opd_consultations"

    consult_id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.patient_id"), nullable=False, index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False, index=True)
    chief_complaint: Mapped[str] = mapped_column(String(500), nullable=False)
    diagnosis_code: Mapped[str | None] = mapped_column(String(20))  # free-text, no ICD-10 lookup yet
    diagnosis_text: Mapped[str] = mapped_column(String(500), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    consult_date: Mapped[date] = mapped_column(Date, nullable=False, server_default=func.current_date())
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    prescription: Mapped["Prescription | None"] = relationship(
        back_populates="consultation", uselist=False, cascade="all, delete-orphan"
    )


class Prescription(Base):
    """Zero-or-one per consultation - only created if the doctor actually
    adds at least one medicine. "Advice only" visits have no Prescription
    row at all, never an empty placeholder one."""

    __tablename__ = "opd_prescriptions"

    rx_id: Mapped[int] = mapped_column(primary_key=True)
    consult_id: Mapped[int] = mapped_column(
        ForeignKey("opd_consultations.consult_id"), nullable=False, unique=True, index=True
    )
    instructions: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    consultation: Mapped["Consultation"] = relationship(back_populates="prescription")
    items: Mapped[list["PrescriptionItem"]] = relationship(
        back_populates="prescription", cascade="all, delete-orphan", order_by="PrescriptionItem.item_id"
    )


class PrescriptionItem(Base):
    __tablename__ = "opd_prescription_items"

    item_id: Mapped[int] = mapped_column(primary_key=True)
    rx_id: Mapped[int] = mapped_column(ForeignKey("opd_prescriptions.rx_id"), nullable=False, index=True)
    med_name: Mapped[str] = mapped_column(String(255), nullable=False)  # free-text, no medicines FK yet
    dose: Mapped[str] = mapped_column(String(100), nullable=False)
    frequency: Mapped[str] = mapped_column(String(100), nullable=False)
    duration: Mapped[str] = mapped_column(String(100), nullable=False)

    prescription: Mapped["Prescription"] = relationship(back_populates="items")
