"""fix audit_logs created_at missing DEFAULT NOW()

Revision ID: 20260406_1200
Revises: 20260404_0733_d4e44053afd4
Create Date: 2026-04-06

The audit_logs.created_at column was created without a database-level
DEFAULT, causing NotNullViolation on every login/audit write.
"""
from alembic import op

revision = "20260406_1200"
down_revision = "d4e44053afd4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE audit_logs ALTER COLUMN created_at SET DEFAULT NOW()"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE audit_logs ALTER COLUMN created_at DROP DEFAULT"
    )
