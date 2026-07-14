"""FastAPI application entrypoint (the CORE).

Run with:  uvicorn app.main:app --reload
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.health import router as health_router
from app.modules.example_hello.router import router as example_hello_router

app = FastAPI(title=settings.app_name, version=settings.app_version)

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
        "service": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/api/health",
    }
