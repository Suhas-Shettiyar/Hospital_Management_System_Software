"""Seeds module_registry with rows for known packages on startup.

Idempotent: only inserts rows for manifests that don't already have one.
Existing rows are never updated here - once a row exists, the database is
authoritative (e.g. an admin's later enable/disable choice must survive).
"""
from sqlalchemy.orm import Session

from app.config import settings
from app.core.module_registry.models import ModuleRegistry
from app.core.plugins.loader import DiscoveredModule, build_plugin_manager, discover_modules


def seed_default_modules(db: Session, discovered: dict[str, DiscoveredModule] | None = None) -> None:
    if discovered is None:
        discovered = discover_modules(build_plugin_manager())

    for module_id, mod in discovered.items():
        if db.get(ModuleRegistry, module_id) is not None:
            continue
        db.add(
            ModuleRegistry(
                module_id=module_id,
                version=mod.manifest["version"],
                enabled=module_id in settings.enabled_modules_list,
            )
        )
    db.commit()
