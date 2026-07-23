"""Seeds module_registry with rows for known packages on startup.

Idempotent: only inserts rows for manifests that don't already have one.
Existing rows are never updated here - once a row exists, the database is
authoritative (e.g. an admin's later enable/disable choice must survive).
"""
from sqlalchemy.orm import Session

from app.config import settings
from app.core.module_registry.models import ModuleRegistry
from app.modules.example_hello.router import MODULE_MANIFEST as _example_hello_manifest

# Today, only example_hello has a real manifest. As real department packages
# (opd, lab, pharmacy, ...) get built, add their MODULE_MANIFEST here too.
KNOWN_MANIFESTS = [_example_hello_manifest]


def seed_default_modules(db: Session) -> None:
    for manifest in KNOWN_MANIFESTS:
        module_id = manifest["id"]
        if db.get(ModuleRegistry, module_id) is not None:
            continue
        db.add(
            ModuleRegistry(
                module_id=module_id,
                version=manifest["version"],
                enabled=module_id in settings.enabled_modules_list,
            )
        )
    db.commit()
