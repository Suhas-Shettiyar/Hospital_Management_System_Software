# Adding authentication later (fastapi-users)

`fastapi-users[sqlalchemy]` is already in requirements.txt but NOT wired in yet,
so the app runs cleanly on first launch.

When you're ready (Phase 1), add:
1. A `User` model (SQLAlchemy) with roles: admin, doctor, nurse, lab, pharmacy, billing, patient.
2. A fastapi-users setup (UserManager, JWT strategy, auth backend).
3. Include the auth routers in `app/main.py` under `/api/auth`.

Docs: https://fastapi-users.github.io/fastapi-users/

We chose fastapi-users over Keycloak deliberately: it's lightweight (no separate
Java service), which suits an 8 GB development machine and a single-tenant HMS.
