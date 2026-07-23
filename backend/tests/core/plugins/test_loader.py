"""Unit tests for the module dependency resolver.

These use small fake DiscoveredModule dicts rather than real packages,
since only example_hello exists today (with depends_on: []) and doesn't
exercise multi-package dependencies.
"""
import pytest

from app.core.plugins.loader import DiscoveredModule, resolve_install_order


def _module(module_id: str, depends_on: list[str] | None = None) -> DiscoveredModule:
    return DiscoveredModule(
        manifest={"id": module_id, "name": module_id, "version": "0.1.0", "depends_on": depends_on or []},
        router=None,
    )


def test_linear_chain_resolves_in_dependency_order():
    discovered = {
        "c": _module("c", depends_on=["b"]),
        "a": _module("a"),
        "b": _module("b", depends_on=["a"]),
    }
    assert resolve_install_order(discovered) == ["a", "b", "c"]


def test_independent_modules_resolve_in_deterministic_order():
    discovered = {"b": _module("b"), "a": _module("a")}
    assert resolve_install_order(discovered) == ["a", "b"]


def test_unknown_dependency_raises():
    discovered = {"a": _module("a", depends_on=["ghost"])}
    with pytest.raises(ValueError, match="unknown module"):
        resolve_install_order(discovered)


def test_cycle_raises():
    discovered = {
        "a": _module("a", depends_on=["b"]),
        "b": _module("b", depends_on=["a"]),
    }
    with pytest.raises(ValueError, match="cycle"):
        resolve_install_order(discovered)
