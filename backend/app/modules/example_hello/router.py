"""A tiny example module router, mounted by the core in app/main.py.
Replace/copy this pattern to build real packages (opd, lab, pharmacy, ...)."""
from fastapi import APIRouter

router = APIRouter(prefix="/hello", tags=["example_hello"])

MODULE_MANIFEST = {
    "id": "example_hello",
    "name": "Example Hello Module",
    "version": "0.1.0",
    "depends_on": [],
}


@router.get("")
def hello():
    return {"message": "Hello from the example module!", "module": MODULE_MANIFEST["id"]}
