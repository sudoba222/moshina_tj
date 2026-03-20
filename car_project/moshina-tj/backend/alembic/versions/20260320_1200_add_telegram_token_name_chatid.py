"""add telegram_name and telegram_chat_id to telegram_tokens

Revision ID: 20260320_1200
Revises: 20260320_1100
Create Date: 2026-03-20 12:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = "20260320_1200"
down_revision = "20260320_1100"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("telegram_tokens", sa.Column("telegram_name", sa.String(200), nullable=True))
    op.add_column("telegram_tokens", sa.Column("telegram_chat_id", sa.String(32), nullable=True))


def downgrade() -> None:
    op.drop_column("telegram_tokens", "telegram_chat_id")
    op.drop_column("telegram_tokens", "telegram_name")
