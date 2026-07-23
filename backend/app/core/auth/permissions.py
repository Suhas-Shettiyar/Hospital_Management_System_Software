"""The role -> permission map (MedCore HMS RBAC spec, Phase 1).

Kept free of FastAPI imports so it stays a plain, unit-testable mapping that
any module - or a future user-seeding CLI - can import without pulling in
web-framework code. The FastAPI enforcement dependency lives in
dependencies.py and is built on top of permissions_for().
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
        "billing:read", "billing:write", "billing:collect",
        "ipd:read", "ipd:write",
        "reports:view",
        "admin:users",
    },
    UserRole.FRONTDESK: {
        "patients:read", "patients:write",
        "queue:read", "queue:write",
        "billing:read", "billing:write",
    },
    UserRole.DOCTOR: {
        "patients:read",
        "queue:read", "queue:write",
        "consultation:read", "consultation:write",
        "vitals:write",
        "lab:read", "lab:write",
        "pharmacy:read",
        "ipd:read", "ipd:write",
        "reports:view",
    },
    UserRole.NURSE: {
        "patients:read",
        "queue:read",
        "consultation:read",
        "vitals:write",
        "ipd:read",
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
        "billing:read", "billing:write", "billing:collect",
        "reports:view",
    },
    # A patient portal login carries exactly one permission - it never grants
    # any staff-facing permission (patients:read, billing:read, etc.), since
    # a patient's own-record access is enforced separately by identity
    # (Consultation.patient_id == current_user.patient_id, not a role check)
    # in app/core/patient_portal/router.py. This entry exists so the
    # frontend sidebar can show "My Records"/"My Appointments" the same way
    # every other role's modules are shown, instead of a bespoke shell.
    UserRole.PATIENT: {
        "portal:self",
    },
}


def permissions_for(role: str) -> set[str]:
    return ROLE_PERMISSIONS.get(role, set())
