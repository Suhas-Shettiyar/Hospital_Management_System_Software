"""The role -> permission map (MedCore HMS RBAC spec, Phase 1).

Kept free of FastAPI imports so it stays a plain, unit-testable mapping that
any module - or a future user-seeding CLI - can import without pulling in
web-framework code. The FastAPI enforcement dependency lives in
dependencies.py and is built on top of permissions_for().

PATIENT is intentionally absent: it's reserved for the future patient-portal
login (Section 5.9) and carries no staff permissions.
"""
from app.core.auth.models import UserRole

ROLE_PERMISSIONS: dict[str, set[str]] = {
    UserRole.ADMIN: {
        "patients:read", "patients:write",
        "queue:read", "queue:write",
        "consultation:read", "consultation:write",
        "vitals:write",
        "lab:read", "lab:write",
        "pharmacy:read", "pharmacy:dispense", "pharmacy:purchase", "pharmacy:master", "pharmacy:returns",
        "billing:read", "billing:collect",
        "reports:view",
        "admin:users",
    },
    UserRole.FRONTDESK: {
        "patients:read", "patients:write",
        "queue:read", "queue:write",
        "billing:read",
    },
    UserRole.DOCTOR: {
        "patients:read",
        "queue:read", "queue:write",
        "consultation:read", "consultation:write",
        "vitals:write",
        "lab:read",
        "pharmacy:read",
        "reports:view",
    },
    UserRole.NURSE: {
        "patients:read",
        "queue:read",
        "consultation:read",
        "vitals:write",
    },
    UserRole.LAB: {
        "patients:read",
        "lab:read", "lab:write",
        "reports:view",
    },
    UserRole.PHARMACIST: {
        "patients:read",
        "pharmacy:read", "pharmacy:dispense", "pharmacy:purchase", "pharmacy:master", "pharmacy:returns",
        "billing:read",
        "reports:view",
    },
    UserRole.CASHIER: {
        "patients:read",
        "pharmacy:read",
        "billing:read", "billing:collect",
        "reports:view",
    },
}


def permissions_for(role: str) -> set[str]:
    return ROLE_PERMISSIONS.get(role, set())
