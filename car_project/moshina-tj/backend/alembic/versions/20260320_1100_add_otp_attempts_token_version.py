"""add otp attempts counter and user token_version for JWT revocation

Revision ID: 20260320_1100
Revises: 20260320_1000
Create Date: 2026-03-20 11:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = "20260320_1100"
down_revision = "20260320_1000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # OTP brute-force protection: track failed attempts per OTP record
    op.add_column(
        "otp_codes",
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
    )

    # JWT revocation: bump this integer to invalidate all existing tokens for a user
    op.add_column(
        "users",
        sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("otp_codes", "attempts")
    op.drop_column("users", "token_version")
