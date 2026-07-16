"""Tracks which department packages exist and whether each is enabled.

This is what the future plugin loader reads to decide what to mount at
startup. Rows are seeded (see seed.py), never created by a migration, since
which packages are actually deployed varies per hospital install.
"""
from datetime import datetime

from sqlalchemy import Boolean, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ModuleRegistry(Base):
    __tablename__ = "module_registry"

    module_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    installed_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(onupdate=func.now())
