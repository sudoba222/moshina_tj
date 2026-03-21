"""add chat, dealer subscriptions, and notifications tables

Revision ID: 20260321_2000
Revises: 20260321_1000
Create Date: 2026-03-21 20:00:00.000000

Adds the Communication & Engagement schema:
- conversations       (direct and support chats)
- messages            (per-conversation messages)
- dealer_subscriptions (user follows a dealer)
- notifications       (in-app notifications)

Also creates the required Postgres ENUM types:
- conversationtype ('direct', 'support')
- notificationtype ('message', 'price_drop', 'dealer_post', 'system')
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20260321_2000"
down_revision = "20260321_1000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # Create ENUM types first (must exist before column references them)
    # ------------------------------------------------------------------
    conversationtype = postgresql.ENUM(
        "direct", "support",
        name="conversationtype",
        create_type=True,
    )
    conversationtype.create(op.get_bind(), checkfirst=True)

    notificationtype = postgresql.ENUM(
        "message", "price_drop", "dealer_post", "system",
        name="notificationtype",
        create_type=True,
    )
    notificationtype.create(op.get_bind(), checkfirst=True)

    # ------------------------------------------------------------------
    # conversations
    # ------------------------------------------------------------------
    op.create_table(
        "conversations",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "type",
            sa.Enum("direct", "support", name="conversationtype", create_type=False),
            nullable=False,
        ),
        sa.Column("participant1_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("participant2_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("listing_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["participant1_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["participant2_id"], ["users.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["listing_id"], ["listings.id"], ondelete="SET NULL"
        ),
        sa.UniqueConstraint(
            "participant1_id", "participant2_id", "listing_id",
            name="uq_conversation",
        ),
    )
    op.create_index("ix_conversations_participant1_id", "conversations", ["participant1_id"])
    op.create_index("ix_conversations_participant2_id", "conversations", ["participant2_id"])
    op.create_index("ix_conversations_listing_id", "conversations", ["listing_id"])

    # ------------------------------------------------------------------
    # messages
    # ------------------------------------------------------------------
    op.create_table(
        "messages",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sender_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "is_read",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["conversation_id"], ["conversations.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["sender_id"], ["users.id"], ondelete="CASCADE"
        ),
    )
    op.create_index("ix_messages_conversation_id", "messages", ["conversation_id"])

    # ------------------------------------------------------------------
    # dealer_subscriptions
    # ------------------------------------------------------------------
    op.create_table(
        "dealer_subscriptions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("dealer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["dealer_id"], ["dealers.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", "dealer_id", name="uq_dealer_subscription"),
    )

    # ------------------------------------------------------------------
    # notifications
    # ------------------------------------------------------------------
    op.create_table(
        "notifications",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "type",
            sa.Enum(
                "message", "price_drop", "dealer_post", "system",
                name="notificationtype",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("link", sa.String(500), nullable=True),
        sa.Column(
            "is_read",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_notifications_user_id", table_name="notifications")
    op.drop_table("notifications")

    op.drop_table("dealer_subscriptions")

    op.drop_index("ix_messages_conversation_id", table_name="messages")
    op.drop_table("messages")

    op.drop_index("ix_conversations_listing_id", table_name="conversations")
    op.drop_index("ix_conversations_participant2_id", table_name="conversations")
    op.drop_index("ix_conversations_participant1_id", table_name="conversations")
    op.drop_table("conversations")

    # Drop ENUM types last
    op.execute("DROP TYPE IF EXISTS notificationtype")
    op.execute("DROP TYPE IF EXISTS conversationtype")
