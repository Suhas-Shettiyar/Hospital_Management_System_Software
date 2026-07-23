# Architecture Decisions — 001: Foundational Choices

## Modular monolith with a plugin system (superseded — see update below)
~~All hospital modules (OPD, appointments, lab, pharmacy, IPD, etc.) live in
one codebase. A per-hospital config decides which modules are
enabled/mounted at startup.~~

~~**Reason:** small clinics don't need every module; a config-driven on/off
switch is far simpler to build, deploy, and reason about than a true
plugin/runtime-loading system, which is more complexity than a 2-person team
needs for a first product.~~

> **Superseded (2026-07-16):** the project's `HMS_Technical_Roadmap.pdf`
> specifies a real plugin architecture (modeled on Odoo) instead of simple
> feature flags — per-department packages, each with its own Python wheel,
> its own PostgreSQL schema, a `module.json` manifest, a `pluggy`/entry-points
> runtime loader, a `module_registry` table, and (eventually) a Gitea-hosted
> package registry with an in-app "Module Store" UI. Confirmed with the user
> to build the full plugin system per that roadmap, not the simpler
> feature-flag version described above. Reason given: matches the considered
> technical plan (note: partner's original `requirements.txt` already
> included `pluggy`, suggesting this was the intended direction from the
> start) and supports selling individual departments per hospital
> independently later.

## Custom JWT authentication (not Keycloak, not fastapi-users)
We are building our own login and token system using python-jose (JWT
handling) and argon2-cffi (password hashing), instead of running a separate
identity provider like Keycloak or using the fastapi-users library.

**Reason:** Keycloak is a full separate Java service — heavyweight to run and
operate for a single-tenant HMS aimed at small clinics. A lightweight
in-house JWT system is simpler to deploy and keeps full control over
roles/permissions logic. Note both roadmap PDFs specify Keycloak for
identity/RBAC/SSO/MFA — this decision explicitly overrides that in favor of
the original custom-JWT plan.

> **Update (2026-07-16):** confirmed with both collaborators — going with
> custom JWT, not `fastapi-users`, not Keycloak. Scope also includes
> **password reset** and **email verification** flows on top of login.
> `fastapi-users` is being removed from `requirements.txt` since nothing used
> it yet.
