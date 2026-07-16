"""Read-only endpoint exposing module_registry's real DB state - used by the
frontend to decide which remote modules to load at runtime (Stage 4).
Unauthenticated for now, same precedent as /health (no PII, read-only)."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.module_registry.models import ModuleRegistry
from app.core.module_registry.schemas import ModuleStatus
from app.database import get_db

router = APIRouter(prefix="/modules", tags=["module_registry"])


@router.get("", response_model=list[ModuleStatus])
def list_modules(db: Session = Depends(get_db)):
    return db.query(ModuleRegistry).order_by(ModuleRegistry.module_id).all()
