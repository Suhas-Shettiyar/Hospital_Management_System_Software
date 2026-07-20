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
# Exception to "core doesn't import specific packages" - same explicit-list
# philosophy already used in alembic/env.py. lab_test_catalog is reference
# data, not app logic, and seeding it here (like module_registry) keeps the
# curated list editable without a new migration each time.
from app.modules.lab.seed import seed_default_lab_catalog
from app.core.plugins.loader import (
    build_plugin_manager,
    discover_modules,
    get_enabled_module_ids,
    resolve_install_order,
)
from app.core.auth.router import router as auth_router
from app.core.module_registry.router import router as module_registry_router
from app.core.patients.router import router as patients_router
from app.api.health import router as health_router

# Discovery + registration + dependency resolution is pure, in-memory, no
# database - runs once at import time. A bad manifest, cycle, or duplicate
# id is a real code/config bug and should crash startup loudly, not be
# swallowed.
_discovered = discover_modules(build_plugin_manager())
_install_order = resolve_install_order(_discovered)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seed module_registry with any known packages not yet in the table, and
    # mount only the ones enabled in the DB. Best-effort: the app should
    # still start even if the DB isn't up yet (core routes still work),
    # consistent with the rest of the app's lazy-DB-connection approach.
    # Toggling a module's enabled flag takes effect on the next restart, not
    # instantly - there is no live hot-reload of the route table.
    enabled_ids: set[str] = set()
    try:
        db = SessionLocal()
        try:
            seed_default_modules(db, discovered=_discovered)
            seed_default_lab_catalog(db)
            enabled_ids = get_enabled_module_ids(db)
        finally:
            db.close()
    except Exception as exc:  # noqa: BLE001 - don't block startup on a DB hiccup
        print(f"[startup] module_registry unreachable, mounting no optional packages: {exc}")

    for module_id in _install_order:
        if module_id in enabled_ids:
            app.include_router(_discovered[module_id].router, prefix="/api")
            print(f"[startup] mounted package: {module_id}")
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
# Core (always-on, never toggled): health + auth + module_registry (read-only) + patients.
app.include_router(health_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(module_registry_router, prefix="/api")
app.include_router(patients_router, prefix="/api")

# Optional department packages (opd, lab, pharmacy, example_hello, ...) are
# mounted by the loader inside lifespan() above, based on module_registry.


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
