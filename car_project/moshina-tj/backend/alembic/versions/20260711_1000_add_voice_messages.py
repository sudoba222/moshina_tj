"""Add voice message support to messages (message_type, attachment_url, duration)

Revision ID: 20260711_1000
Revises: 20260704_1000
Create Date: 2026-07-11
"""
import sqlalchemy as sa
from alembic import op

revision = "20260711_1000"
down_revision = "20260704_1000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "messages",
        sa.Column("message_type", sa.String(10), nullable=False, server_default="text"),
    )
    op.add_column("messages", sa.Column("attachment_url", sa.String(500), nullable=True))
    op.add_column("messages", sa.Column("duration_seconds", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("messages", "duration_seconds")
    op.drop_column("messages", "attachment_url")
    op.drop_column("messages", "message_type")
