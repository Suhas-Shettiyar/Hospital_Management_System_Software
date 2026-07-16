"""Helper for writing audit_log entries.

Always add the entry to the same DB session/transaction as the write it
documents, then commit together - no separate audit transaction or queue.
"""
from sqlalchemy.orm import Session

from app.core.audit.models import AuditLog


def record_audit(
    db: Session,
    *,
    actor_user_id: int | None,
    action: str,
    entity: str,
    entity_id: str | None = None,
    ip_address: str | None = None,
) -> AuditLog:
    entry = AuditLog(
        actor_user_id=actor_user_id,
        action=action,
        entity=entity,
        entity_id=entity_id,
        ip_address=ip_address,
    )
    db.add(entry)
    return entry
