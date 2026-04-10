"""make user phone nullable — email-only accounts no longer need placeholder

Revision ID: a1b2c3d4e5f6
Revises: 20260407_1600_fix_audit_search_log_id_defaults
Create Date: 2026-04-10 12:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '20260410_1200'
down_revision = '20260407_1600'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Clear fake placeholder phones created by email-only registration
    op.execute("UPDATE users SET phone = NULL WHERE phone LIKE 'email\\_%' ESCAPE '\\'")
    # Make phone nullable
    op.alter_column('users', 'phone', existing_type=sa.String(50), nullable=True)


def downgrade() -> None:
    # Restore NOT NULL — first fill NULLs with a placeholder so the constraint can be applied
    op.execute("UPDATE users SET phone = 'unknown_' || id::text WHERE phone IS NULL")
    op.alter_column('users', 'phone', existing_type=sa.String(50), nullable=False)
