"""Patient master record."""
from datetime import date, datetime

from sqlalchemy import Date, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Gender:
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"

    ALL = (MALE, FEMALE, OTHER)


class BloodGroup:
    A_POS, A_NEG = "A+", "A-"
    B_POS, B_NEG = "B+", "B-"
    AB_POS, AB_NEG = "AB+", "AB-"
    O_POS, O_NEG = "O+", "O-"

    ALL = (A_POS, A_NEG, B_POS, B_NEG, AB_POS, AB_NEG, O_POS, O_NEG)


class ConsentStatus:
    PENDING = "pending"
    GRANTED = "granted"
    DENIED = "denied"
    WITHDRAWN = "withdrawn"

    ALL = (PENDING, GRANTED, DENIED, WITHDRAWN)


class Patient(Base):
    __tablename__ = "patients"

    patient_id: Mapped[int] = mapped_column(primary_key=True)
    uhid: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    abha_number: Mapped[str | None] = mapped_column(String(50), unique=True)
    abha_address: Mapped[str | None] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    dob: Mapped[date] = mapped_column(Date, nullable=False)
    gender: Mapped[str] = mapped_column(
        Enum(*Gender.ALL, name="patient_gender", native_enum=False, validate_strings=True),
        nullable=False,
    )
    phone: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    address: Mapped[str | None] = mapped_column(String(500))
    blood_group: Mapped[str | None] = mapped_column(
        Enum(*BloodGroup.ALL, name="patient_blood_group", native_enum=False, validate_strings=True)
    )
    consent_status: Mapped[str] = mapped_column(
        Enum(*ConsentStatus.ALL, name="patient_consent_status", native_enum=False, validate_strings=True),
        nullable=False,
        default=ConsentStatus.PENDING,
        server_default=ConsentStatus.PENDING,
    )
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
