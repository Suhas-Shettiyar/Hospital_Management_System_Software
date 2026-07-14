# MedCore HMS — Starter Project

A minimal, runnable starting point for the modular Hospital Management System.
Two separate folders:

- `backend/`  — FastAPI (Python) API. Serves `/api/health`.
- `frontend/web-shell/` — Vite + React + TypeScript. Calls the backend and shows its status.

This starter is intentionally small and light so it runs comfortably on 8 GB RAM.
No Docker required to start. PostgreSQL is optional for the first run.

---

## Prerequisites (install once)

- Python 3.13.x        https://www.python.org/downloads/   (tick "Add Python to PATH")
- Node.js 24 LTS       https://nodejs.org/en/download
- Git                  https://git-scm.com/downloads
- PostgreSQL 18 (optional for now)  https://www.postgresql.org/download/windows/

---

## 1) Run the BACKEND

Open a terminal in the `backend` folder:

```bat
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

Backend is now at http://localhost:8000
- Health check:      http://localhost:8000/api/health
- Interactive docs:  http://localhost:8000/docs
- Example module:    http://localhost:8000/api/hello

(macOS/Linux: use `source .venv/bin/activate` and `cp .env.example .env`.)

## 2) Run the FRONTEND

Open a SECOND terminal in the `frontend/web-shell` folder:

```bat
cd frontend\web-shell
npm install
npm run dev
```

Frontend is now at http://localhost:5173 — open it in your browser.
If the backend is running, the page shows a green "Backend connected" status.

---

## Your first milestone

Both servers running + the frontend page showing "Backend connected" =
your environment is proven and you have officially started. Commit and push:

```bat
git init
git add .
git commit -m "Initial HMS starter: backend + frontend talking"
```

## What's NOT included yet (add in later phases)
- Redis/Valkey + Celery (Phase 4+)
- Docker (for packaging/deployment, not daily coding)
- Auth (fastapi-users) — scaffold notes in backend/app/auth_notes.md
- Mobile app / Tauri desktop (later phases)
