"""User accounts and supporting auth tokens (password reset / email verification).

Enums are stored as plain strings with a CHECK constraint (native_enum=False)
rather than native PostgreSQL enum types, since native enums can't have a
value added inside a transaction - awkward as more roles/statuses are added
by future department packages.
"""
from datetime import datetime

from sqlalchemy import Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserRole:
    ADMIN = "admin"
    FRONTDESK = "frontdesk"
    DOCTOR = "doctor"
    NURSE = "nurse"
    LAB = "lab"
    PHARMACIST = "pharmacist"
    CASHIER = "cashier"
    PATIENT = "patient"

    ALL = (ADMIN, FRONTDESK, DOCTOR, NURSE, LAB, PHARMACIST, CASHIER, PATIENT)


class UserStatus:
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

    ALL = (ACTIVE, INACTIVE, SUSPENDED)


class AuthTokenPurpose:
    EMAIL_VERIFICATION = "email_verification"
    PASSWORD_RESET = "password_reset"

    ALL = (EMAIL_VERIFICATION, PASSWORD_RESET)


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        Enum(*UserRole.ALL, name="user_role", native_enum=False, validate_strings=True),
        nullable=False,
    )
    # Only ever set for role=patient rows - links a portal login to the
    # clinical record it represents. Nullable because most Users (staff)
    # have no corresponding Patient row at all.
    patient_id: Mapped[int | None] = mapped_column(ForeignKey("patients.patient_id"), index=True)
    status: Mapped[str] = mapped_column(
        Enum(*UserStatus.ALL, name="user_status", native_enum=False, validate_strings=True),
        nullable=False,
        default=UserStatus.ACTIVE,
        server_default=UserStatus.ACTIVE,
    )
    is_verified: Mapped[bool] = mapped_column(nullable=False, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(onupdate=func.now())

    auth_tokens: Mapped[list["AuthToken"]] = relationship(back_populates="user")


class AuthToken(Base):
    """A single-use token for password reset or email verification.

    Only the hash of the token is stored - the raw token is emailed to the
    user and never persisted, so a database leak can't be used to reset
    passwords or verify emails directly.
    """

    __tablename__ = "auth_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False, index=True)
    purpose: Mapped[str] = mapped_column(
        Enum(*AuthTokenPurpose.ALL, name="auth_token_purpose", native_enum=False, validate_strings=True),
        nullable=False,
    )
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(nullable=False)
    consumed_at: Mapped[datetime | None] = mapped_column()

    user: Mapped["User"] = relationship(back_populates="auth_tokens")
