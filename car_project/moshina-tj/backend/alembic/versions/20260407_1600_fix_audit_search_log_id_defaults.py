"""fix audit_logs.id and search_logs.id missing server default

Revision ID: 20260407_1600
Revises: 20260406_1500
Create Date: 2026-04-07

audit_logs.id and search_logs.id have no server-side default in the database,
so INSERT statements that omit the id column fail with:

  NotNullViolation: null value in column "id" of relation "audit_logs"

Fix: set gen_random_uuid() as the server default on both columns.
Requires the pgcrypto extension (already enabled via an earlier migration).
"""
from alembic import op

revision = "20260407_1600"
down_revision = "20260406_1500"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE audit_logs ALTER COLUMN id SET DEFAULT gen_random_uuid()"
    )
    op.execute(
        "ALTER TABLE search_logs ALTER COLUMN id SET DEFAULT gen_random_uuid()"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE audit_logs ALTER COLUMN id DROP DEFAULT")
    op.execute("ALTER TABLE search_logs ALTER COLUMN id DROP DEFAULT")
