"""Pluggy hook implementations for opd. router.py stays the single source of
truth for MODULE_MANIFEST and the router object; this file just exposes both
through the loader's hook contract."""
from app.core.plugins.hookspecs import hookimpl
from app.modules.opd.router import router, MODULE_MANIFEST


@hookimpl
def module_manifest() -> dict:
    return MODULE_MANIFEST


@hookimpl
def module_router():
    return router
