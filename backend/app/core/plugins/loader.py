"""Pluggy-based loader for optional department packages (Stage 3).

Discovery is a hardcoded list of dotted hookimpl-module paths, not real
setuptools entry_points, because packages still live in this monorepo and
aren't separately pip-installable yet. When a package becomes its own
distribution (Phase 10 / Module Store), replace KNOWN_PACKAGE_MODULES's
source with:
    importlib.metadata.entry_points(group="medcore.modules")
Nothing else here (hookspecs, resolution, DB cross-referencing) needs to
change when that happens.
"""
import importlib
from dataclasses import dataclass

import pluggy
from fastapi import APIRouter
from sqlalchemy.orm import Session

from app.core.plugins.hookspecs import PROJECT_NAME, ModuleHookSpecs
from app.core.module_registry.models import ModuleRegistry

# Single source of truth for "which optional packages exist" - both
# seed.py and main.py's router-mounting derive their data from this one
# list, instead of maintaining two separate hardcoded lists.
KNOWN_PACKAGE_MODULES: list[str] = [
    "app.modules.example_hello.plugin",
    "app.modules.opd.plugin",
    "app.modules.lab.plugin",
    "app.modules.pharmacy.plugin",
    "app.modules.appointments.plugin",
    "app.modules.ipd.plugin",
]


@dataclass(frozen=True)
class DiscoveredModule:
    manifest: dict
    router: APIRouter


def build_plugin_manager(package_modules: list[str] | None = None) -> pluggy.PluginManager:
    pm = pluggy.PluginManager(PROJECT_NAME)
    pm.add_hookspecs(ModuleHookSpecs)
    for dotted_path in (package_modules if package_modules is not None else KNOWN_PACKAGE_MODULES):
        pm.register(importlib.import_module(dotted_path), name=dotted_path)
    return pm


def discover_modules(pm: pluggy.PluginManager) -> dict[str, DiscoveredModule]:
    """Calls each registered plugin's hooks directly (not via the aggregate
    pm.hook.xxx() calls) so a manifest and its router are paired by
    construction, not by trusting two independent aggregate hook calls to
    return results in the same order."""
    discovered: dict[str, DiscoveredModule] = {}
    for name, plugin in pm.list_name_plugin():
        manifest = plugin.module_manifest()
        router = plugin.module_router()
        module_id = manifest["id"]
        if module_id in discovered:
            raise ValueError(f"Duplicate module id '{module_id}' (from plugin '{name}')")
        discovered[module_id] = DiscoveredModule(manifest=manifest, router=router)
    return discovered


def resolve_install_order(discovered: dict[str, DiscoveredModule]) -> list[str]:
    """Topological sort (Kahn's algorithm) over each manifest's depends_on.
    Raises ValueError on an unknown dependency or a cycle - these are code/
    config bugs and should crash startup loudly, not be swallowed."""
    in_degree = {mid: 0 for mid in discovered}
    dependents: dict[str, list[str]] = {mid: [] for mid in discovered}
    for mid, mod in discovered.items():
        for dep in mod.manifest.get("depends_on", []):
            if dep not in discovered:
                raise ValueError(f"Module '{mid}' depends on unknown module '{dep}'")
            dependents[dep].append(mid)
            in_degree[mid] += 1

    queue = sorted(mid for mid, deg in in_degree.items() if deg == 0)
    order: list[str] = []
    while queue:
        queue.sort()  # deterministic tie-break
        mid = queue.pop(0)
        order.append(mid)
        for nxt in dependents[mid]:
            in_degree[nxt] -= 1
            if in_degree[nxt] == 0:
                queue.append(nxt)

    if len(order) != len(discovered):
        raise ValueError(f"Dependency cycle among modules: {sorted(set(discovered) - set(order))}")
    return order


def get_enabled_module_ids(db: Session) -> set[str]:
    rows = db.query(ModuleRegistry.module_id).filter(ModuleRegistry.enabled.is_(True)).all()
    return {row[0] for row in rows}
