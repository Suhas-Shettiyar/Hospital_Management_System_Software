"""FastAPI application entrypoint (the CORE).

Run with:  uvicorn app.main:app --reload
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.database import engine, SessionLocal
from app.core.module_registry.seed import seed_default_modules
from app.api.health import router as health_router
from app.modules.example_hello.router import router as example_hello_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seed module_registry with any known packages not yet in the table.
    # Best-effort: the app should still start even if the DB isn't up yet,
    # consistent with the rest of the app's lazy-DB-connection approach.
    try:
        db = SessionLocal()
        try:
            seed_default_modules(db)
        finally:
            db.close()
    except Exception as exc:  # noqa: BLE001 - don't block startup on a DB hiccup
        print(f"[startup] module_registry seeding skipped: {exc}")
    yield


app = FastAPI(title=settings.app_name, version=settings.app_version, lifespan=lifespan)

# Allow the Vite dev server (and later, the deployed frontend) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# All API routes live under /api (the frontend proxies /api -> this backend).
app.include_router(health_router, prefix="/api")

# --- Package mounting -------------------------------------------------------
# Each optional package is included here. In the full build, an automatic
# loader reads which packages are enabled and mounts them. For the starter we
# mount the example module directly so you can see the pattern.
app.include_router(example_hello_router, prefix="/api")
# ---------------------------------------------------------------------------


@app.get("/")
def root():
    return {
        "app": settings.app_name,
        "version": settings.app_version,
        "enabled_modules": settings.enabled_modules_list,
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health():
    """Top-level health check (distinct from /api/health, which the frontend
    uses) - confirms the app is up AND that PostgreSQL is reachable."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as exc:  # noqa: BLE001 - surface any connection problem
        db_status = f"unavailable: {exc}"
    return {"status": "ok", "database": db_status}
