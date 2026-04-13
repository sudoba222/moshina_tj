"""backfill NULL user_number for email and OAuth users

Revision ID: 20260413_1100
Revises: 20260413_1000
Create Date: 2026-04-13 11:00:00.000000

All users registered via email or OAuth had user_number = NULL because the
SQLAlchemy model lacked server_default, so it sent NULL explicitly in INSERTs,
overriding the DB DEFAULT. This migration assigns sequential IDs to all
users that are still missing one. The model is now fixed with server_default.
"""
from alembic import op

revision = '20260413_1100'
down_revision = '20260413_1000'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Assign a user_number from the sequence to every user that is missing one.
    # The sequence already exists (created in 20260327_1100).
    op.execute("""
        UPDATE users
        SET user_number = nextval('users_user_number_seq')
        WHERE user_number IS NULL
    """)


def downgrade() -> None:
    # Cannot reliably reverse — we don't know which numbers were freshly assigned.
    pass
