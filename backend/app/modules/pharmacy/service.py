"""Non-trivial pharmacy business logic that doesn't belong in the router -
same separation-of-concerns pattern as app.core.patients.service."""
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.pharmacy.models import MedicineBatch


def deduct_fefo(db: Session, medicine_id: int, quantity: int) -> list[tuple[MedicineBatch, int]]:
    """Greedily deducts `quantity` units of a medicine from its batches,
    earliest expiry_date first (FEFO), splitting across as many batches as
    needed. Rows are locked with .with_for_update() so two concurrent
    dispenses (e.g. two pharmacy counters) can't double-allocate the same
    stock - a real concern with multiple terminals, not a speculative one.

    Raises 409 if total available stock across all batches is insufficient
    - callers should not persist anything from a failed call (the caller's
    surrounding db.commit()/rollback() governs that; this function only
    mutates in-memory ORM objects plus whatever the caller flushes/commits).

    Returns [(batch, amount_deducted), ...] for the caller to persist as
    DispenseItemBatch rows.
    """
    batches = (
        db.query(MedicineBatch)
        .filter(MedicineBatch.medicine_id == medicine_id, MedicineBatch.quantity_on_hand > 0)
        .order_by(MedicineBatch.expiry_date)
        .with_for_update()
        .all()
    )

    remaining = quantity
    allocations: list[tuple[MedicineBatch, int]] = []
    for batch in batches:
        if remaining <= 0:
            break
        take = min(remaining, batch.quantity_on_hand)
        batch.quantity_on_hand -= take
        allocations.append((batch, take))
        remaining -= take

    if remaining > 0:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Insufficient stock for medicine_id={medicine_id}: short by {remaining} {('unit' if remaining == 1 else 'units')}",
        )

    # The session has autoflush=False (app.database.SessionLocal) - without
    # an explicit flush here, a second dispense line for the SAME medicine
    # later in the same request would query stale (pre-deduction)
    # quantity_on_hand values, since nothing would have been sent to the DB
    # yet. Flushing (not committing) makes this call's deductions visible to
    # subsequent queries in the same transaction while still leaving the
    # whole request's outcome uncommitted until the router commits.
    db.flush()
    return allocations
