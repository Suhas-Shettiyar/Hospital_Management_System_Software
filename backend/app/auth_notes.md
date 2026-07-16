# Adding authentication (custom JWT)

Decided (see `docs/decisions/001-choices.md`): a hand-rolled JWT auth system
using `python-jose` (tokens) and `argon2-cffi` (password hashing) - not
Keycloak, not `fastapi-users`. The `User` and `AuthToken` models already
exist at `app/core/auth/models.py` (roles: admin, doctor, nurse, lab,
pharmacy, billing, patient; `AuthToken` covers both password-reset and
email-verification links via a `purpose` field).

Still to build (next stage):
1. Login/register endpoints issuing/validating JWTs.
2. Password hashing + verification with argon2-cffi.
3. Password-reset and email-verification flows using the `AuthToken` table.
4. Include the auth routers in `app/main.py` under `/api/auth`.
