# Authentication (custom JWT) - status

Built (see `docs/decisions/001-choices.md` for the why): hand-rolled JWT auth
using `python-jose` (tokens) and `argon2-cffi` (password hashing) - not
Keycloak, not `fastapi-users`. Endpoints live at `app/core/auth/router.py`,
mounted under `/api/auth`:

- `POST /register`, `POST /login`, `GET /me`
- `POST /password-reset-request`, `POST /password-reset-confirm`
- `POST /verify-email`, `POST /resend-verification`

Access tokens are a single Bearer JWT, ~10h expiry (no refresh token) - long
enough for a hospital shift. Email delivery (verification/reset links) goes
through Brevo's free transactional API (`app/core/auth/email.py`); if
`BREVO_API_KEY` isn't set in `.env`, sending is skipped with a log line
instead of failing.

**Known, deliberate gaps (not yet built):**
1. `/register` accepts any role, including `admin` - but only until the
   first admin account exists, after which further `role=admin` signups are
   rejected (see the guard in `router.py`). Non-admin staff roles
   (doctor/nurse/lab/pharmacy/billing) remain openly self-registerable -
   a real admin-only "create staff account" endpoint is still needed before
   real deployment.
2. No refresh tokens, logout, or token revocation - a token stays valid
   until its own expiry even after a password reset.
3. No rate limiting / brute-force lockout on `/login` or
   `/password-reset-request`.
