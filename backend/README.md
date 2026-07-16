# Backend (FastAPI)

```bat
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

- http://localhost:8000/api/health   -> {"status":"ok", ...}
- http://localhost:8000/api/hello     -> example module
- http://localhost:8000/docs          -> interactive API docs

PostgreSQL is optional for the first run. Once installed, set your password in
`.env` (DATABASE_URL) and create a database named `hms`, then check
http://localhost:8000/api/health/db

## Structure
```
backend/
  app/
    main.py            # core app; mounts routers/packages
    config.py          # settings from .env
    database.py        # SQLAlchemy engine/session (lazy connect)
    api/health.py      # /api/health and /api/health/db
    core/              # always-on foundation: auth, patients, audit, billing, module_registry
    modules/           # department packages (opd, lab, pharmacy, ipd, ...) live here
      example_hello/   # example package showing the router pattern
    auth_notes.md      # how custom JWT auth gets wired in (see docs/decisions/)
  alembic/             # database migrations
  requirements.txt
  .env.example
```
