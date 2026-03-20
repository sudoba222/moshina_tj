"""add composite indexes for performance

Revision ID: 20260320_1000
Revises: 20260317_1300_add_banners
Create Date: 2026-03-20 10:00:00
"""
from alembic import op

revision = "20260320_1000"
down_revision = "20260317_1300_add_banners"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Primary catalog filter: status + created_at covers every public listing query
    # (filter by status='active', order by created_at DESC)
    op.create_index(
        "ix_listings_status_created_at",
        "listings",
        ["status", "created_at"],
    )
    # Price range filter — most common catalog filter
    op.create_index(
        "ix_listings_status_price",
        "listings",
        ["status", "price"],
    )
    # Year range filter
    op.create_index(
        "ix_listings_status_year",
        "listings",
        ["status", "year"],
    )
    # Fuel / transmission / type column indexes (used as standalone filters)
    op.create_index("ix_listings_fuel", "listings", ["fuel"])
    op.create_index("ix_listings_transmission", "listings", ["transmission"])
    op.create_index("ix_listings_type", "listings", ["type"])

    # OTP verification: phone + is_used queried together on every OTP check
    op.create_index(
        "ix_otp_codes_phone_isused",
        "otp_codes",
        ["phone", "is_used"],
    )
    # Email OTP: email + purpose + is_used
    op.create_index(
        "ix_otp_codes_email_purpose_isused",
        "otp_codes",
        ["email", "purpose", "is_used"],
    )

    # SearchLog: created_at needed for the 30-day window aggregation in /popular
    op.create_index("ix_search_logs_created_at", "search_logs", ["created_at"])

    # User filters
    op.create_index("ix_users_is_deleted", "users", ["is_deleted"])
    op.create_index("ix_users_is_banned", "users", ["is_banned"])


def downgrade() -> None:
    op.drop_index("ix_listings_status_created_at", table_name="listings")
    op.drop_index("ix_listings_status_price", table_name="listings")
    op.drop_index("ix_listings_status_year", table_name="listings")
    op.drop_index("ix_listings_fuel", table_name="listings")
    op.drop_index("ix_listings_transmission", table_name="listings")
    op.drop_index("ix_listings_type", table_name="listings")
    op.drop_index("ix_otp_codes_phone_isused", table_name="otp_codes")
    op.drop_index("ix_otp_codes_email_purpose_isused", table_name="otp_codes")
    op.drop_index("ix_search_logs_created_at", table_name="search_logs")
    op.drop_index("ix_users_is_deleted", table_name="users")
    op.drop_index("ix_users_is_banned", table_name="users")
