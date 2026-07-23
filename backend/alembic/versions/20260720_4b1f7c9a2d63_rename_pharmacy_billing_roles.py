"""rename pharmacy/billing roles to pharmacist/cashier, add frontdesk role

Revision ID: 4b1f7c9a2d63
Revises: 2587a49be27b
Create Date: 2026-07-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4b1f7c9a2d63'
down_revision: Union[str, Sequence[str], None] = '2587a49be27b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # role is Enum(..., native_enum=False) => a plain VARCHAR with no DB-level
    # CHECK constraint (create_constraint defaults False on this SQLAlchemy
    # version); widen it for the new role names before renaming values.
    op.alter_column('users', 'role', type_=sa.String(length=20))

    op.execute("UPDATE users SET role = 'pharmacist' WHERE role = 'pharmacy'")
    op.execute("UPDATE users SET role = 'cashier' WHERE role = 'billing'")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("UPDATE users SET role = 'pharmacy' WHERE role = 'pharmacist'")
    op.execute("UPDATE users SET role = 'billing' WHERE role = 'cashier'")

    op.alter_column('users', 'role', type_=sa.String(length=8))
