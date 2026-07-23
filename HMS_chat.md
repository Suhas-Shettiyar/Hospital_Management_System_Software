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

**Not yet done:** `project-docs/` and `HMS_chat.md` are untracked in git — not yet committed or pushed. Waiting for user go-ahead before committing/pushing (per instruction to confirm before any push).

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
