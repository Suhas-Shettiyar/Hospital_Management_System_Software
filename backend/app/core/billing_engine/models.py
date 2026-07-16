"""Minimal billing ledger skeleton.

Deliberately bare - just enough for a "billing ledger" to exist as a core
foundation. Line items, GST, and payment modes belong to a later billing
phase, not this stage.
"""
from datetime import datetime

from sqlalchemy import Enum, ForeignKey, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class BillStatus:
    DRAFT = "draft"
    FINALIZED = "finalized"
    PAID = "paid"
    CANCELLED = "cancelled"

    ALL = (DRAFT, FINALIZED, PAID, CANCELLED)


class Bill(Base):
    __tablename__ = "bills"

    bill_id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.patient_id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        Enum(*BillStatus.ALL, name="bill_status", native_enum=False, validate_strings=True),
        nullable=False,
        default=BillStatus.DRAFT,
        server_default=BillStatus.DRAFT,
    )
    total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
