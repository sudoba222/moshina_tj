"""add listing status, rejection_reason, moderated_by, is_banned, ban_reason

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-03-13
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "b2c3d4e5f6a7"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade():
    # Create listingstatus enum
    op.execute("CREATE TYPE listingstatus AS ENUM ('pending', 'active', 'rejected', 'draft')")

    # Add status column to listings — existing rows become 'active' (they were already live)
    op.add_column(
        "listings",
        sa.Column(
            "status",
            sa.Enum("pending", "active", "rejected", "draft", name="listingstatus"),
            nullable=False,
            server_default="active",
        ),
    )
    op.create_index("ix_listings_status", "listings", ["status"])

    # Add rejection_reason
    op.add_column("listings", sa.Column("rejection_reason", sa.Text(), nullable=True))

    # Add moderated_by (FK to users, nullable)
    op.add_column(
        "listings",
        sa.Column(
            "moderated_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    # Add is_banned and ban_reason to users
    op.add_column(
        "users",
        sa.Column("is_banned", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column("users", sa.Column("ban_reason", sa.Text(), nullable=True))


def downgrade():
    op.drop_column("users", "ban_reason")
    op.drop_column("users", "is_banned")
    op.drop_column("listings", "moderated_by")
    op.drop_column("listings", "rejection_reason")
    op.drop_index("ix_listings_status", table_name="listings")
    op.drop_column("listings", "status")
    op.execute("DROP TYPE listingstatus")
