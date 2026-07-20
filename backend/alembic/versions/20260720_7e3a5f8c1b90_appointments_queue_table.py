"""appointments/queue table

Revision ID: 7e3a5f8c1b90
Revises: 4b1f7c9a2d63
Create Date: 2026-07-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7e3a5f8c1b90'
down_revision: Union[str, Sequence[str], None] = '4b1f7c9a2d63'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('appointments',
    sa.Column('appointment_id', sa.Integer(), nullable=False),
    sa.Column('patient_id', sa.Integer(), nullable=False),
    sa.Column('doctor_id', sa.Integer(), nullable=False),
    sa.Column('token_no', sa.Integer(), nullable=False),
    sa.Column('status', sa.Enum('waiting', 'in_consult', 'done', name='appointment_status', native_enum=False), server_default='waiting', nullable=False),
    sa.Column('scheduled_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['doctor_id'], ['users.user_id'], ),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.patient_id'], ),
    sa.PrimaryKeyConstraint('appointment_id')
    )
    op.create_index(op.f('ix_appointments_doctor_id'), 'appointments', ['doctor_id'], unique=False)
    op.create_index(op.f('ix_appointments_patient_id'), 'appointments', ['patient_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_appointments_patient_id'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_doctor_id'), table_name='appointments')
    op.drop_table('appointments')
