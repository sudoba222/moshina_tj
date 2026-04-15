"""add extra_attrs JSON column to listings

Revision ID: 20260415_1000
Revises: 20260414_1000
Create Date: 2026-04-15 10:00:00.000000

Adds extra_attrs (JSON, nullable) to listings table for storing
category-specific attributes such as moto_type, payload_capacity, etc.
"""

from alembic import op
import sqlalchemy as sa

revision = "20260415_1000"
down_revision = "20260414_1000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("listings", sa.Column("extra_attrs", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("listings", "extra_attrs")
