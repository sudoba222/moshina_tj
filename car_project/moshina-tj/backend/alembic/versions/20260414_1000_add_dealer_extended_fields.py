"""add extended fields to dealers table

Revision ID: 20260414_1000
Revises: 20260413_1100
Create Date: 2026-04-14 10:00:00.000000

Adds: cover_image_url, website, working_hours (JSON), instagram, telegram_handle
to the dealers table to support full dealer profile editing.
"""

from alembic import op
import sqlalchemy as sa

revision = "20260414_1000"
down_revision = "20260413_1100"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("dealers", sa.Column("cover_image_url", sa.Text(), nullable=True))
    op.add_column("dealers", sa.Column("website", sa.String(300), nullable=True))
    op.add_column("dealers", sa.Column("working_hours", sa.JSON(), nullable=True))
    op.add_column("dealers", sa.Column("instagram", sa.String(200), nullable=True))
    op.add_column("dealers", sa.Column("telegram_handle", sa.String(200), nullable=True))


def downgrade() -> None:
    op.drop_column("dealers", "telegram_handle")
    op.drop_column("dealers", "instagram")
    op.drop_column("dealers", "working_hours")
    op.drop_column("dealers", "website")
    op.drop_column("dealers", "cover_image_url")
