"""add fcm_token to users

Revision ID: 20260624_1000
Revises: 20260420_1000
Create Date: 2026-06-24 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260624_1000"
down_revision = "20260420_1000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("fcm_token", sa.String(500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "fcm_token")
