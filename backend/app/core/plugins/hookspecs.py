"""The plugin contract every optional department package must implement.

This defines *what* a package is (pluggy hookspecs), not *how* packages are
discovered (see loader.py's KNOWN_PACKAGE_MODULES for that, and its
docstring for why it's a plain list today instead of entry_points).
"""
import pluggy

PROJECT_NAME = "medcore"
hookspec = pluggy.HookspecMarker(PROJECT_NAME)
hookimpl = pluggy.HookimplMarker(PROJECT_NAME)


class ModuleHookSpecs:
    """Contract for an optional department package (opd, lab, pharmacy, ...)."""

    @hookspec
    def module_manifest(self) -> dict:
        """Return this package's manifest: id, name, version, depends_on."""

    @hookspec
    def module_router(self):
        """Return the FastAPI APIRouter this package mounts under /api."""
