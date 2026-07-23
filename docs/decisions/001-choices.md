# Architecture Decisions — 001: Foundational Choices

## Modular monolith with feature flags (not a runtime plugin system)
All hospital modules (OPD, appointments, lab, pharmacy, IPD, etc.) live in one
codebase. A per-hospital config decides which modules are enabled/mounted at
startup.

**Reason:** small clinics don't need every module; a config-driven on/off
switch is far simpler to build, deploy, and reason about than a true
plugin/runtime-loading system, which is more complexity than a 2-person team
needs for a first product.

## Custom JWT authentication (not Keycloak)
We are building our own login and token system using python-jose (JWT
handling) and argon2-cffi (password hashing), instead of running a separate
identity provider like Keycloak.

**Reason:** Keycloak is a full separate Java service — heavyweight to run and
operate for a single-tenant HMS aimed at small clinics. A lightweight
in-house JWT system is simpler to deploy and keeps full control over
roles/permissions logic.

> **Note (2026-07-15):** the existing backend scaffold currently lists
> `fastapi-users` in `requirements.txt` as a candidate auth library — not yet
> wired into any code. The custom-JWT-vs-fastapi-users choice is being
> discussed between the two collaborators before backend auth work begins.
> This record reflects the original plan and will be updated once that
> discussion concludes.
