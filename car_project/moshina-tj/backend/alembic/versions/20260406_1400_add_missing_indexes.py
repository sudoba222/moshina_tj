"""add missing indexes for audit_logs, search_logs, otp_codes, brands

Revision ID: 20260406_1400
Revises: 20260406_1200
Create Date: 2026-04-06

Adds indexes that were identified in the schema audit:
- audit_logs.actor_id  (FK without index)
- search_logs.user_id  (FK without index)
- otp_codes composite  (phone, purpose, is_used) — queried together on every OTP lookup
- brands.is_popular    (used in catalog homepage query)
- brands.is_active     (used in catalog filter)
"""
from alembic import op

revision = "20260406_1400"
down_revision = "20260406_1200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_audit_logs_actor_id", "audit_logs", ["actor_id"])
    op.create_index("ix_search_logs_user_id", "search_logs", ["user_id"])
    op.create_index(
        "ix_otp_codes_phone_purpose_is_used",
        "otp_codes",
        ["phone", "purpose", "is_used"],
    )
    op.create_index("ix_brands_is_popular", "brands", ["is_popular"])
    op.create_index("ix_brands_is_active", "brands", ["is_active"])


def downgrade() -> None:
    op.drop_index("ix_brands_is_active", table_name="brands")
    op.drop_index("ix_brands_is_popular", table_name="brands")
    op.drop_index("ix_otp_codes_phone_purpose_is_used", table_name="otp_codes")
    op.drop_index("ix_search_logs_user_id", table_name="search_logs")
    op.drop_index("ix_audit_logs_actor_id", table_name="audit_logs")
