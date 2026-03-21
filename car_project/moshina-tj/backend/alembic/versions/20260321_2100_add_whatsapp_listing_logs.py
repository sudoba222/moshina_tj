"""add whatsapp_number to users and listing_logs table

Revision ID: 20260321_2100
Revises: 20260321_2000
Create Date: 2026-03-21 21:00:00.000000

Changes:
- users.whatsapp_number VARCHAR(50) nullable
- listing_logs table (immutable audit trail for every listing action)
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20260321_2100"
down_revision = "20260321_2000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # Add whatsapp_number to users
    # ------------------------------------------------------------------
    op.add_column("users", sa.Column("whatsapp_number", sa.String(50), nullable=True))

    # ------------------------------------------------------------------
    # Create listing_logs table
    # ------------------------------------------------------------------
    op.create_table(
        "listing_logs",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("listing_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("from_status", sa.String(50), nullable=True),
        sa.Column("to_status", sa.String(50), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["listing_id"], ["listings.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["actor_id"], ["users.id"], ondelete="SET NULL"
        ),
    )
    op.create_index("ix_listing_logs_listing_id", "listing_logs", ["listing_id"])


def downgrade() -> None:
    op.drop_index("ix_listing_logs_listing_id", table_name="listing_logs")
    op.drop_table("listing_logs")
    op.drop_column("users", "whatsapp_number")
