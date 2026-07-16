"""Append-only audit log (DPDP compliance).

`action`/`entity` are deliberately plain strings, not enums or foreign keys:
the vocabulary of actions and the set of entities grows with every future
department package, so a rigid type here would force a migration per new
package. Append-only-ness is enforced at the database level (see the
migration for this table), not just by code discipline.
"""
from datetime import datetime

from sqlalchemy import ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_log"

    log_id: Mapped[int] = mapped_column(primary_key=True)
    actor_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.user_id"), index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    entity: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_id: Mapped[str | None] = mapped_column(String(100))
    ip_address: Mapped[str | None] = mapped_column(String(45))
    timestamp: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False, index=True)
