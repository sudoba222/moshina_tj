"""add email auth fields

Revision ID: 20260316_1000
Revises: 20260314_1300_add_otp_codes
Create Date: 2026-03-16 10:00:00

Changes:
- users: add email_verified (bool), phone_verified (bool)
- otp_codes: add email (varchar), purpose (varchar); make phone nullable
"""

from alembic import op
import sqlalchemy as sa

revision = "20260316_1000"
down_revision = "f0e1d2c3b4a5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── users table ──────────────────────────────────────────────────────────
    op.add_column("users", sa.Column("email_verified", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("users", sa.Column("phone_verified", sa.Boolean(), nullable=False, server_default="false"))

    # ── otp_codes table ──────────────────────────────────────────────────────
    # Make phone nullable (was NOT NULL)
    op.alter_column("otp_codes", "phone", existing_type=sa.String(20), nullable=True)
    # Add email column for email OTPs
    op.add_column("otp_codes", sa.Column("email", sa.String(200), nullable=True))
    op.create_index("ix_otp_codes_email", "otp_codes", ["email"])
    # Add purpose column to distinguish phone_auth vs email_verify
    op.add_column(
        "otp_codes",
        sa.Column("purpose", sa.String(20), nullable=False, server_default="phone_auth"),
    )


def downgrade() -> None:
    op.drop_column("otp_codes", "purpose")
    op.drop_index("ix_otp_codes_email", table_name="otp_codes")
    op.drop_column("otp_codes", "email")
    op.alter_column("otp_codes", "phone", existing_type=sa.String(20), nullable=False)
    op.drop_column("users", "phone_verified")
    op.drop_column("users", "email_verified")
