"""Importing this package registers every core ORM model on
app.database.Base.metadata - required for Alembic autogenerate and for
SQLAlchemy's mapper configuration (cross-model foreign keys)."""
from app.core.auth import models as _auth_models  # noqa: F401
from app.core.patients import models as _patients_models  # noqa: F401
from app.core.audit import models as _audit_models  # noqa: F401
from app.core.billing_engine import models as _billing_models  # noqa: F401
from app.core.module_registry import models as _module_registry_models  # noqa: F401
