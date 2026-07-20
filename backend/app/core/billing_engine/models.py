"""Billing ledger: bills, their line items, and payments.

Core, always-on - not a toggleable department package like OPD/Lab/Pharmacy/
Appointments (see the roadmap's architecture diagram: "Billing Engine (core
ledger)" sits inside the always-on CORE PLATFORM box). Bills are mutable
while draft (items can be added/removed, total recomputed each time) and
locked once finalized - a real bill shouldn't silently change after that
point. GST amounts are computed and persisted on each BillItem at entry
time, never recomputed later, so a finalized bill keeps showing the rate
that applied when it was made even if rates change in the future.
"""
from datetime import datetime

from sqlalchemy import Enum, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class BillStatus:
    DRAFT = "draft"
    FINALIZED = "finalized"
    PAID = "paid"
    CANCELLED = "cancelled"

    ALL = (DRAFT, FINALIZED, PAID, CANCELLED)


class PaymentMode:
    CASH = "cash"
    UPI = "upi"
    CARD = "card"
    OTHER = "other"

    ALL = (CASH, UPI, CARD, OTHER)


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
    created_by: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    finalized_at: Mapped[datetime | None] = mapped_column()

    items: Mapped[list["BillItem"]] = relationship(
        back_populates="bill", cascade="all, delete-orphan", order_by="BillItem.item_id"
    )
    payments: Mapped[list["Payment"]] = relationship(
        back_populates="bill", cascade="all, delete-orphan", order_by="Payment.received_at"
    )

    @property
    def amount_paid(self) -> float:
        """Convenience for BillOut's from_attributes serialization - callers
        must eager-load .payments (selectinload) to avoid an N+1. Casts each
        amount to float before summing - Numeric columns deserialize to
        Decimal once round-tripped through the DB, and mixing that with a
        float accumulator raises TypeError."""
        return sum((float(p.amount) for p in self.payments), start=0.0)

    @property
    def balance_due(self) -> float:
        return float(self.total) - self.amount_paid


class BillItem(Base):
    """subtotal/gst_amount/line_total are computed once, server-side, when
    the item is added (quantity * unit_price, then gst_rate applied) and
    stored - not derived on read, so a finalized bill's numbers never drift
    if unit prices or GST rates change elsewhere later."""

    __tablename__ = "bill_items"

    item_id: Mapped[int] = mapped_column(primary_key=True)
    bill_id: Mapped[int] = mapped_column(ForeignKey("bills.bill_id"), nullable=False, index=True)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[int] = mapped_column(nullable=False, default=1, server_default="1")
    unit_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    gst_rate: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0, server_default="0")
    subtotal: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    gst_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    line_total: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    bill: Mapped["Bill"] = relationship(back_populates="items")


class Payment(Base):
    __tablename__ = "payments"

    payment_id: Mapped[int] = mapped_column(primary_key=True)
    bill_id: Mapped[int] = mapped_column(ForeignKey("bills.bill_id"), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    mode: Mapped[str] = mapped_column(
        Enum(*PaymentMode.ALL, name="payment_mode", native_enum=False, validate_strings=True),
        nullable=False,
    )
    reference_number: Mapped[str | None] = mapped_column(String(100))
    received_by: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    received_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    bill: Mapped["Bill"] = relationship(back_populates="payments")
