"""Lab clinical models: test orders and their results.

depends_on stays [] in this package's manifest (see plugin.py) even though
lab_orders.consult_id has a real FK into opd_consultations: migrations in
this codebase are global (every KNOWN_PACKAGE_MODULES model gets migrated
regardless of module_registry.enabled) - only router MOUNTING is gated by
enablement, and the FK's target table always exists once migrated. Don't
"fix" this by adding a phantom dependency - there is no ordering problem to
solve here.
"""
from datetime import datetime

from sqlalchemy import Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class LabOrderStatus:
    ORDERED = "ordered"
    COMPLETED = "completed"

    ALL = (ORDERED, COMPLETED)


class LabTestCatalog(Base):
    """A small, curated STARTER set of common lab tests with widely-published
    LOINC codes - NOT a full/licensed LOINC terminology sync. Spot-check
    these codes against an authoritative source (loinc.org) before relying
    on them for anything regulatory/FHIR-facing (that only actually matters
    starting at the ABDM/FHIR phase). default_reference_range is deliberately
    left unpopulated in the seed data (see seed.py) - a wrong default range
    is worse than none; the column exists for future curation."""

    __tablename__ = "lab_test_catalog"

    catalog_id: Mapped[int] = mapped_column(primary_key=True)
    loinc_code: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    test_name: Mapped[str] = mapped_column(String(255), nullable=False)
    default_reference_range: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True, server_default="true")


class LabOrder(Base):
    __tablename__ = "lab_orders"

    order_id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.patient_id"), nullable=False, index=True)
    # Optional: a lab test can be ordered standalone (walk-in) or as part of
    # an OPD consultation - never a hard dependency on OPD being enabled.
    consult_id: Mapped[int | None] = mapped_column(
        ForeignKey("opd_consultations.consult_id"), index=True
    )
    # Optional traceability link to the catalog entry used at order time (same
    # nullable-FK pattern as consult_id above). test_code/test_name below are
    # still the source of truth on the order itself - denormalized from the
    # catalog at creation so a later edit to the catalog never rewrites
    # historical orders. Null when the order used the free-text fallback.
    catalog_id: Mapped[int | None] = mapped_column(
        ForeignKey("lab_test_catalog.catalog_id"), index=True
    )
    test_code: Mapped[str | None] = mapped_column(String(20))  # LOINC code when catalog-sourced, else free-text
    test_name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(
        Enum(*LabOrderStatus.ALL, name="lab_order_status", native_enum=False, validate_strings=True),
        nullable=False,
        default=LabOrderStatus.ORDERED,
        server_default=LabOrderStatus.ORDERED,
    )
    ordered_by: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False, index=True)
    ordered_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    result: Mapped["LabResult | None"] = relationship(
        back_populates="order", uselist=False, cascade="all, delete-orphan"
    )
    catalog: Mapped["LabTestCatalog | None"] = relationship()


class LabResult(Base):
    """Zero-or-one per order - only created when a result is actually
    entered, via a separate endpoint from order creation (a real two-step,
    asynchronous workflow: ordered now, resulted later, possibly by a
    different logged-in user)."""

    __tablename__ = "lab_results"

    result_id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(
        ForeignKey("lab_orders.order_id"), nullable=False, unique=True, index=True
    )
    result_data: Mapped[str] = mapped_column(Text, nullable=False)
    reference_range: Mapped[str | None] = mapped_column(String(255))
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    order: Mapped["LabOrder"] = relationship(back_populates="result")
