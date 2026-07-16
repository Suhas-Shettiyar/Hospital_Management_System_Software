"""Response models for the module_registry read-only endpoint."""
from datetime import datetime

from pydantic import BaseModel


class ModuleStatus(BaseModel):
    module_id: str
    version: str
    enabled: bool
    installed_at: datetime

    class Config:
        from_attributes = True
