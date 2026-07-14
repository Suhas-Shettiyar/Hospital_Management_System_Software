"""Health endpoints. /api/health always works; /api/health/db checks the DB."""
from fastapi import APIRouter
from sqlalchemy import text

from app.config import settings
from app.database import engine

router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.app_version,
    }


@router.get("/health/db")
def health_db():
    """Try a trivial query. Reports 'connected' or the error message."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"database": "connected"}
    except Exception as exc:  # noqa: BLE001 - surface any connection problem
        return {"database": "unavailable", "detail": str(exc)}
