"""Pharmacy inventory models: medicine master, batched/expiring stock, and
dispensing.

Append-only for Dispense/DispenseItem/DispenseItemBatch (no edit/delete
routes) - the same "no amend" philosophy as OPD/Lab: a mistake needs a new
corrective transaction, not edited history. Medicine itself gets a narrow
PATCH (is_active/reorder_level only, same shape as Patient's consent-status
update) since discontinuing a medicine or tuning its reorder threshold is a
real, ongoing operational need, not a historical record.
"""
from datetime import date, datetime

from sqlalchemy import Date, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Medicine(Base):
    __tablename__ = "pharmacy_medicines"

    medicine_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    hsn_code: Mapped[str | None] = mapped_column(String(20))
    gst_rate: Mapped[float | None] = mapped_column(Numeric(5, 2))  # percent, e.g. 12.00
    unit: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g. "tablet", "bottle", "strip"
    reorder_level: Mapped[int] = mapped_column(nullable=False, default=10, server_default="10")
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    batches: Mapped[list["MedicineBatch"]] = relationship(
        back_populates="medicine", order_by="MedicineBatch.expiry_date"
    )


class MedicineBatch(Base):
    """Stock is received in dated batches - dispensing deducts from these,
    earliest expiry_date first (FEFO, see service.deduct_fefo), never a
    flat total on Medicine itself."""

    __tablename__ = "pharmacy_medicine_batches"

    batch_id: Mapped[int] = mapped_column(primary_key=True)
    medicine_id: Mapped[int] = mapped_column(ForeignKey("pharmacy_medicines.medicine_id"), nullable=False, index=True)
    batch_number: Mapped[str] = mapped_column(String(100), nullable=False)
    expiry_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    quantity_on_hand: Mapped[int] = mapped_column(nullable=False)
    cost_price: Mapped[float | None] = mapped_column(Numeric(10, 2))
    mrp: Mapped[float | None] = mapped_column(Numeric(10, 2))
    received_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    medicine: Mapped["Medicine"] = relationship(back_populates="batches")


class Dispense(Base):
    """Header for a dispensing transaction - one or more medicines given to
    a patient in one sitting, by whoever is logged in at the counter."""

    __tablename__ = "pharmacy_dispenses"

    dispense_id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.patient_id"), nullable=False, index=True)
    # Optional traceability to the OPD prescription this dispense fulfills -
    # same nullable-FK pattern as lab_orders.consult_id. A walk-in/OTC sale
    # with no prescription is equally valid, so this is never required.
    prescription_id: Mapped[int | None] = mapped_column(ForeignKey("opd_prescriptions.rx_id"), index=True)
    dispensed_by: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False, index=True)
    dispensed_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    items: Mapped[list["DispenseItem"]] = relationship(
        back_populates="dispense", cascade="all, delete-orphan", order_by="DispenseItem.item_id"
    )


class DispenseItem(Base):
    """One medicine + total quantity within a Dispense. The quantity may be
    satisfied from more than one batch (see DispenseItemBatch) - this row
    records what was asked for, not which batch(es) supplied it."""

    __tablename__ = "pharmacy_dispense_items"

    item_id: Mapped[int] = mapped_column(primary_key=True)
    dispense_id: Mapped[int] = mapped_column(ForeignKey("pharmacy_dispenses.dispense_id"), nullable=False, index=True)
    medicine_id: Mapped[int] = mapped_column(ForeignKey("pharmacy_medicines.medicine_id"), nullable=False, index=True)
    quantity: Mapped[int] = mapped_column(nullable=False)

    dispense: Mapped["Dispense"] = relationship(back_populates="items")
    medicine: Mapped["Medicine"] = relationship()
    batch_allocations: Mapped[list["DispenseItemBatch"]] = relationship(
        back_populates="dispense_item", cascade="all, delete-orphan"
    )

    @property
    def medicine_name(self) -> str:
        """Convenience for DispenseItemOut's from_attributes serialization -
        callers must eager-load .medicine (selectinload) to avoid an N+1."""
        return self.medicine.name


class DispenseItemBatch(Base):
    """Records exactly which batch(es) a DispenseItem's quantity was
    deducted from - a line item spans more than one row only when true FEFO
    had to split it (the earliest-expiring batch alone didn't have enough
    stock). Needed for accurate audit/costing, since cost_price can differ
    between batches of the same medicine."""

    __tablename__ = "pharmacy_dispense_item_batches"

    id: Mapped[int] = mapped_column(primary_key=True)
    dispense_item_id: Mapped[int] = mapped_column(
        ForeignKey("pharmacy_dispense_items.item_id"), nullable=False, index=True
    )
    batch_id: Mapped[int] = mapped_column(ForeignKey("pharmacy_medicine_batches.batch_id"), nullable=False, index=True)
    quantity_deducted: Mapped[int] = mapped_column(nullable=False)

    dispense_item: Mapped["DispenseItem"] = relationship(back_populates="batch_allocations")
    batch: Mapped["MedicineBatch"] = relationship()

    @property
    def batch_number(self) -> str:
        """Convenience for DispenseItemBatchOut's from_attributes
        serialization - callers must eager-load .batch to avoid an N+1."""
        return self.batch.batch_number
