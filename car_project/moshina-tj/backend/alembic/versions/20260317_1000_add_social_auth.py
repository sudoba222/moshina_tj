"""add social auth fields and telegram_tokens

Revision ID: 20260317_1000
Revises: 20260316_1000
Create Date: 2026-03-17 10:00:00

Changes:
- users: add google_id, apple_id, telegram_chat_id
- create telegram_tokens table
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "20260317_1000"
down_revision = "20260316_1000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── users: social auth columns ───────────────────────────────────────────
    op.add_column("users", sa.Column("google_id", sa.String(200), nullable=True))
    op.add_column("users", sa.Column("apple_id", sa.String(200), nullable=True))
    op.add_column("users", sa.Column("telegram_chat_id", sa.String(50), nullable=True))
    op.create_index("ix_users_google_id", "users", ["google_id"], unique=True)
    op.create_index("ix_users_apple_id", "users", ["apple_id"], unique=True)
    op.create_index("ix_users_telegram_chat_id", "users", ["telegram_chat_id"], unique=True)

    # ── telegram_tokens table ────────────────────────────────────────────────
    op.create_table(
        "telegram_tokens",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("token", sa.String(64), nullable=False),
        sa.Column("phone", sa.String(20), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_used", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_telegram_tokens_token", "telegram_tokens", ["token"], unique=True)
    op.create_index("ix_telegram_tokens_phone", "telegram_tokens", ["phone"])


def downgrade() -> None:
    op.drop_index("ix_telegram_tokens_phone", table_name="telegram_tokens")
    op.drop_index("ix_telegram_tokens_token", table_name="telegram_tokens")
    op.drop_table("telegram_tokens")
    op.drop_index("ix_users_telegram_chat_id", table_name="users")
    op.drop_index("ix_users_apple_id", table_name="users")
    op.drop_index("ix_users_google_id", table_name="users")
    op.drop_column("users", "telegram_chat_id")
    op.drop_column("users", "apple_id")
    op.drop_column("users", "google_id")
