# MedCore HMS — Project Chat & Update Log

This file is the running memory of everything decided, done, and pending on this project.
Every session should start by reading the latest entries here, and end by adding a new entry.

---

## How to use this file
- Newest entries go at the **top** (reverse chronological).
- Each entry: date, who worked (you / partner / assistant), what was done, what's pending/next.
- Decisions and tech-stack changes should also be mirrored into `docs/decisions/` once the repo skeleton exists.

---

## Log

### 2026-07-16 (much later) — Stage 1 of "Core Platform + Package Framework" complete: DB schema + Alembic
Entered plan mode to scope this properly since it's a multi-week roadmap phase; agreed to split it into stages and build only Stage 1 now (schema + Alembic). Plan saved at `C:\Users\Lenovo\.claude\plans\sprightly-wondering-fiddle.md`.

**Built:**
- Alembic properly initialized for the first time (`backend/alembic.ini`, `backend/alembic/env.py` wired to `app.config.settings` for the DB URL and `app.database.Base.metadata` for autogenerate; `compare_type`/`compare_server_default` enabled; chronological migration filenames via `file_template`).
- Five new SQLAlchemy 2.0-style (`Mapped`/`mapped_column`) models, filling in the previously-empty `app/core/{auth,patients,audit,billing_engine}/` folders plus a new `app/core/module_registry/`:
  - `users` + `auth_tokens` (`app/core/auth/models.py`) — custom JWT foundation; `auth_tokens` handles both password-reset and email-verification via a `purpose` column, storing only a hash of the token.
  - `patients` (`app/core/patients/models.py`) — uhid, optional ABHA fields, demographics, consent_status.
  - `audit_log` (`app/core/audit/models.py`) — append-only, enforced by a **Postgres trigger** (not just app discipline) that raises an exception on any UPDATE or DELETE. Tested directly with `psql`: INSERT succeeded, UPDATE and DELETE were both correctly rejected.
  - `module_registry` (new `app/core/module_registry/`) — tracks which department packages exist/are enabled; will be what the future plugin loader reads from.
  - `bills` (`app/core/billing_engine/models.py`) — bare ledger skeleton only (patient, status, total) — full billing logic is a much later phase.
  - Design convention used throughout: enums stored as `native_enum=False` (text + CHECK constraint) since Postgres native enums can't have values added inside a transaction, and this project will keep adding roles/statuses as new department packages land. Money columns use `Numeric(12,2)`, never `Float`.
- `app/core/__init__.py` now aggregates all core models (single import point Alembic autogenerate needs).
- First migration generated, hand-reviewed, and finished (added the audit_log trigger SQL to `upgrade()`/`downgrade()`). Applied successfully to the Docker Postgres (port 5433): all 6 tables + `alembic_version` confirmed via `psql \dt`. Full `alembic downgrade base` → `alembic upgrade head` round-trip tested clean.
- A small startup seeding routine (`app/core/module_registry/seed.py`, called from a new FastAPI `lifespan` handler in `main.py`) that inserts a `module_registry` row for any known package manifest not yet present — idempotent, never overwrites existing rows. Verified: `example_hello` got seeded correctly (`enabled=false`, since it's not in the default `enabled_modules` config list, which is meant for real department packages).
- Backend restarted and re-verified: `/health` still reports `"database":"connected"`, app boots cleanly with no seeding errors.
- Housekeeping: fixed `backend/app/auth_notes.md` and a line in `backend/README.md`'s structure diagram that still described adopting `fastapi-users` (stale, contradicted the custom-JWT decision).

**Explicitly NOT built yet (future stages, in order):** Stage 2 = actual JWT login/register/password-reset/verify-email endpoints. Stage 3 = the real `pluggy`-based loader that reads `module_registry` and dynamically mounts/unmounts routers (today `main.py` still statically includes `example_hello`'s router regardless of its `enabled` flag). Stage 4 = frontend Vite Module Federation.

**Not committed yet** — need to review `git status` and confirm before staging/pushing.

---

### 2026-07-16 (later still, post-Phase-1) — Major architecture reversal: full plugin system confirmed
Read both roadmap PDFs in `project-docs/` (`HMS_Complete_Roadmap.pdf`, `HMS_Technical_Roadmap.pdf`) to scope "next phase." Found a real conflict: `HMS_Technical_Roadmap.pdf` specifies a genuine **plugin architecture** (Odoo-style) — per-department Python wheels, own DB schemas, `pluggy`/entry-points runtime loader, `module_registry` table, `module.json` manifests, Vite Module Federation on the frontend, a self-hosted Gitea package registry, and an in-app "Module Store" UI. This directly contradicts the original brief's "feature flags, NOT a runtime plugin system" decision that Phase 1 (Tasks 1-7) was built around.

**User's decision: build the full plugin system per the Technical Roadmap**, not the simpler feature-flag version. Note: partner's original `requirements.txt` already included `pluggy`, suggesting this may have been the intended direction from the start. Updated `docs/decisions/001-choices.md` to record this reversal (struck through the old feature-flags decision, documented the new one with reasoning).

**Also confirmed today:** auth is custom JWT (python-jose + argon2-cffi) — not Keycloak (which both roadmap PDFs actually specify!) and not `fastapi-users`. This explicitly overrides the roadmaps' Keycloak mentions. Scope includes password reset + email verification. Uninstalled `fastapi-users`, `fastapi-users-db-sqlalchemy`, and their now-orphaned dependencies (`bcrypt`, `dnspython`, `email-validator`, `makefun`, `pwdlib`, `PyJWT`) from the venv — `pip check` confirmed nothing else depended on them, and the app still imports cleanly. `requirements.txt` re-frozen, clean.

**Next up:** plan and build the Technical Roadmap's "Phase 1: Core Platform + Package Framework" (its own phase 1, distinct from what we did before) — core identity/RBAC/patients/audit/billing (which conveniently already matches our `backend/app/core/` folders from Task 3) plus the actual plugin/module-loader machinery. This is a substantial build — plan before coding.

---

### 2026-07-16 (later still) — Task 7: Phase 1 committed and pushed
Reviewed the full `git status` before staging — confirmed both `backend/.env` and `infra/.env` correctly appear under Git's *ignored* list (not staged). Staged 22 files (skeleton folders from Task 3, updated `config.py`/`main.py`/`requirements.txt` from Tasks 4/6, `infra/docker-compose.yml` + `.env.example` from Task 5, updated README/chat log). Also noticed and included `project-docs/MedCore_HMS_Tech_Stack.pdf`, which had been added to that folder outside of this session.

Committed as `1261410`: "Phase 1: project skeleton, docker services, hello-world API". Pushed to `origin/main` (fast-forward from `d33568d`).

**Phase 1 (project foundation) is now fully done and live on GitHub.** Summary of where things stand:
- Repo: https://github.com/Thejashwini005/Hospital-Management-System, branch `main`, local copy at `D:\HMS software`
- Backend runs via `backend/.venv`, connects to Docker Postgres on **port 5433** (not 5432 — native Postgres already used that port on this machine)
- Docker Compose (`infra/docker-compose.yml`): Postgres 16 (port 5433) + Valkey 8 (port 6379), both healthy, named volumes for persistence
- Backend verified: `/`, `/health` (new, real DB check), `/api/health` (partner's, untouched) all working
- Frontend already scaffolded by partner (Vite+React+TS+AntD+TanStack Query) — not modified this session
- **Open item, needs partner discussion:** auth library choice — her `fastapi-users` vs. the brief's custom JWT (python-jose+argon2-cffi). Both libraries are installed; neither is wired into any code yet. Decision intentionally left open (see `docs/decisions/001-choices.md` note).

---

### 2026-07-16 (later) — Task 6: hello-world backend verified working
Extended (not replaced) partner's existing `main.py`/`config.py`/`database.py`:
- `config.py`: added `enabled_modules` setting (default `"opd,appointments,lab,pharmacy,ipd"`, comma-separated from `.env`) + `enabled_modules_list` property — same pattern as her existing `cors_origins_list`. Also updated the fallback `database_url` default to the correct port 5433/user `hms` for consistency (real value still comes from `.env`).
- `main.py`: root `/` now returns `app`, `version`, and `enabled_modules` (feature-flag list), plus kept `docs`/`health` links. Added a new top-level `GET /health` that actually pings PostgreSQL via the existing `database.py` engine. Did **not** touch her existing `/api/health` (frontend's `lib/api.ts` calls this via the Vite proxy) — left fully intact.

**Verified live** (ran `uvicorn app.main:app --port 8000` from `backend/.venv`, curled all three, then stopped the process):
- `GET /` → `{"app":"MedCore HMS","version":"0.1.0","enabled_modules":["opd","appointments","lab","pharmacy","ipd"],"docs":"/docs","health":"/health"}`
- `GET /health` → `{"status":"ok","database":"connected"}` — confirms the app reaches the Docker Postgres from Task 5 (port 5433) successfully.
- `GET /api/health` → `{"status":"ok","service":"MedCore HMS","version":"0.1.0"}` — partner's original endpoint, unaffected.

---

### 2026-07-16 — Task 4 & Task 5: Python env + Docker services
**Task 4 (Python environment):** created venv at `backend/.venv/` using the `py` launcher (plain `python`/`python3` commands aren't on PATH on this machine — Windows Store stub issue noted in Task 1). Installed partner's existing `requirements.txt` first (kept `fastapi-users`, `pluggy`, `python-dotenv` — nothing of hers removed), then added `python-jose[cryptography]`, `pytest`, `httpx` (the other required packages — `python-multipart`, `argon2-cffi`, `psycopg[binary]`, `sqlalchemy`, `alembic`, `pydantic-settings` — were already pulled in as dependencies of her existing set). Froze everything into `requirements.txt` with pinned versions.

**Task 5 (Docker services) — important system difference found:** port 5432 was already occupied by a **native PostgreSQL install** on this machine (separate from Docker, likely from following partner's README's optional local-Postgres suggestion). Paused and asked user per the "pause on system differences" rule. **User's decision: map Docker's Postgres to host port 5433 instead, leave the native install completely untouched.**

Created `infra/docker-compose.yml` (Postgres 16 + Valkey 8, named volumes `pgdata`/`valkeydata` so data survives restarts, health checks for both), `infra/.env.example` (committable) and `infra/.env` (gitignored, dev password `dev_local_only_password`). Updated `backend/.env.example` and created `backend/.env` to point `DATABASE_URL` at `localhost:5433` (not the default 5432) with user/db `hms`. Started containers — both came up healthy: Postgres `pg_isready` OK, Valkey `PONG`. Confirmed both `.env` files are properly gitignored (`git check-ignore` verified).

**Key fact to remember:** this dev machine's Postgres port is **5433**, not the usual 5432 — any future scripts/tools that assume the default port will fail to connect unless pointed at 5433.

---

### 2026-07-15 (later still) — Task 3: skeleton folders added on top of partner's code
Added (not replacing anything of hers): `backend/app/core/{auth,patients,audit,billing_engine}` (empty `__init__.py` placeholders), 5 new empty module placeholders `backend/app/modules/{opd,appointments,lab,pharmacy,ipd}` alongside her existing `example_hello`, `backend/alembic/` (placeholder, real `alembic init` comes in Task 4), `backend/tests/`, `infra/` (placeholder, real `docker-compose.yml` comes in Task 5), and `docs/decisions/001-choices.md` recording the feature-flags-over-plugin-system and custom-JWT-over-Keycloak decisions (with an explicit note that the JWT-vs-fastapi-users question is still pending discussion with partner). Also added a short header (name/description/team/status) to the top of the existing root `README.md`, keeping all of her original run instructions below it.

**Not committed yet** — these are placeholder folders/files; plan is to commit once Tasks 4–6 give them real content, unless user wants to commit now.

---

### 2026-07-15 (later) — Connected to partner's GitHub repo, reviewed her progress
**Repo:** https://github.com/Thejashwini005/Hospital-Management-System (owned by partner Thejashwini, user added as collaborator). `D:\HMS software` is now `git init`-ed, remote `origin` added, checked out on branch `main` tracking `origin/main`.

**What the partner (Thejashwini) already built (commits: "Initial commit", "First commit", merge):**
- **Frontend** (`frontend/web-shell/`) — Vite + React 19 + TypeScript + **Ant Design 5** + **TanStack Query 5**, exactly matching our tech stack decision. Has an `AppShell` (Sidebar, Topbar, GlobalSearch), a `moduleRegistry.ts` pattern for pluggable feature modules, a stub `LoginPage`/`AuthProvider` (fake login, marked `TODO: replace with real POST /api/auth/login`), and an example `DashboardPage` module.
- **Backend** (`backend/`) — FastAPI skeleton: `main.py`, `config.py` (pydantic-settings), `database.py`, `/api/health` + `/api/health/db` (Postgres ping), and a `modules/example_hello/` folder demonstrating her router-mounting pattern. `.gitignore` and `.env.example` already present and clean (no real secrets).
- Her README documents running everything **without Docker** for a fast first run (Postgres optional initially).

**Conflicts found vs. our brief — flagged to user, decisions made:**
1. **Auth library:** her `requirements.txt` includes `fastapi-users[sqlalchemy]` with a note (`backend/app/auth_notes.md`) planning to wire it in — this conflicts with our brief's decision to hand-roll JWT auth (python-jose + argon2-cffi). **Nothing is wired in yet.** User's decision: **pause, ask partner first** before changing this. Do NOT remove `fastapi-users` or start custom JWT work until user confirms after discussing with her.
2. **Docker posture:** her README treats Docker/Postgres as optional-for-now; our brief mandates Docker for Postgres+Valkey. Not yet resolved as a conflict — just noted; Docker setup (Task 5) will proceed as originally planned since it doesn't remove anything of hers.
3. Folder layout is flatter than the brief's `app/core/{auth,patients,audit,billing_engine}` split (she has `app/api/`, `app/modules/` only) — not a conflict, just not built yet.

**Folder merge decision (user's call):** Created `D:\HMS software\project-docs\` and moved the pre-existing planning files there: `HMS_BRD.pdf`, `HMS_Complete_Roadmap.pdf`, `HMS_Conversation.pdf`, `HMS_Technical_Roadmap.pdf`, both WhatsApp screenshots. The GitHub repo's code (`backend/`, `frontend/`, `README.md`, `.gitignore`) lives directly at the `D:\HMS software` root, alongside `project-docs/` and this `HMS_chat.md`.

**Committed & pushed:** commit `d33568d` "Add project planning docs folder and running chat/update log" — pushed to `origin/main` successfully (fast-forward from `07920a6`). Confirmed only `project-docs/*` and `HMS_chat.md` were staged, no `.env` or secrets included.

**Next steps:** get user's go-ahead to commit+push the docs-folder addition; then continue original task list (Task 3 skeleton, Task 4 Python env, Task 5 Docker, Task 6 hello-world) **adapted to build on top of partner's existing code rather than overwriting it** — e.g. extend her `app/` structure with the `core/` split instead of replacing it, add `alembic/` and `infra/docker-compose.yml` which don't exist yet, and hold off on any auth library change until partner discussion resolves.

---

### 2026-07-15 — Session start (Claude Code assistant)
**Status:** Kicking off Phase 1 (project foundation).

**Context gathered:**
- Project folder: `D:\HMS software` — currently contains planning docs only (`HMS_BRD.pdf`, `HMS_Complete_Roadmap.pdf`, `HMS_Conversation.pdf`, `HMS_Technical_Roadmap.pdf`, two WhatsApp screenshots). **Not yet a Git repository.**
- GitHub repo of record: partner says the project lives at **"Hospital-Management-System"** on GitHub — need username/URL to confirm and connect (pending, see below).
- Tech stack confirmed (see task brief): FastAPI + SQLAlchemy 2.0 + Alembic, PostgreSQL + Valkey via Docker, React/Vite/TS/AntD/TanStack Query frontend, custom JWT auth (python-jose + argon2-cffi, no Keycloak), modular monolith with feature flags (no runtime plugin system), Caddy reverse proxy later.

**Environment check results:**
| Tool | Status |
|---|---|
| Python | 3.14.5 installed, but only reachable via `py` launcher (plain `python`/`python3` commands are Windows Store stubs) |
| pip | 26.1.1 OK |
| Node.js | 20.20.0 OK |
| npm | 10.8.2 OK |
| Git | 2.54.0 OK — but **no global user.name/user.email configured yet** |
| Docker | v29.6.1 installed, **daemon not running yet** (asked user to open Docker Desktop) |
| Docker Compose | v5.3.0 OK (bundled with Docker Desktop) |
| GitHub CLI (`gh`) | Not installed — need alternate way to connect/verify repo, or user provides URL/username directly |

**Pending before continuing:**
1. User to start Docker Desktop and confirm it's running.
2. User to provide GitHub username or full repo URL for "Hospital-Management-System".
3. **Important instruction from user:** before starting any new work, review what the partner has already done in the repo and continue from where she left off — do NOT assume a blank slate once we connect to GitHub.

**Next step once unblocked:** clone/inspect the existing GitHub repo, read through partner's commits/files, summarize progress to the user, then resume the task list (Task 2: Git/GitHub connection, onward) informed by what already exists.

---
