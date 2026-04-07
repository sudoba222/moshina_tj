"""fix users.user_number NOT NULL constraint — column must be nullable

Revision ID: 20260406_1500
Revises: 20260406_1400
Create Date: 2026-04-06

The users.user_number column was created with NOT NULL in the database,
but the SQLAlchemy model defines it as nullable=True. Every email/Google
registration that does not supply a user_number crashes with:

  NotNullViolation: null value in column "user_number" violates not-null constraint

Fix: drop the NOT NULL constraint so the column accepts NULL (auto-increment
user numbers are assigned separately via a trigger or app logic).
"""
from alembic import op

revision = "20260406_1500"
down_revision = "20260406_1400"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ALTER COLUMN user_number DROP NOT NULL")


def downgrade() -> None:
    # Re-add NOT NULL only if all existing rows have a value — dangerous in prod
    op.execute("ALTER TABLE users ALTER COLUMN user_number SET NOT NULL")
