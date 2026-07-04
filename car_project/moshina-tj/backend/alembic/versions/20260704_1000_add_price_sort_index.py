"""Add composite index for price sorting on public listing feeds

Revision ID: 20260704_1000
Revises: 20260624_1000
Create Date: 2026-07-04

The mobile app and web catalog expose sort=price_asc / sort=price_desc on
GET /listings. Those queries filter on (status, is_active) and ORDER BY
price, but price has no index — Postgres sorts the filtered set in memory
on every request. A composite (status, is_active, price) index lets the
sorted feed come straight off the index in both directions.
"""
from alembic import op
import sqlalchemy as sa

revision = "20260704_1000"
down_revision = "20260624_1000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    def _idx_exists(name: str) -> bool:
        result = conn.execute(
            sa.text("SELECT 1 FROM pg_indexes WHERE indexname = :n"),
            {"n": name},
        )
        return result.fetchone() is not None

    if not _idx_exists("ix_listings_status_is_active_price"):
        op.create_index(
            "ix_listings_status_is_active_price",
            "listings",
            ["status", "is_active", "price"],
        )


def downgrade() -> None:
    op.drop_index("ix_listings_status_is_active_price", table_name="listings")
