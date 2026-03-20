"""widen users.phone from VARCHAR(20) to VARCHAR(50)

Revision ID: 20260321_1000
Revises: 20260320_1200
Create Date: 2026-03-21 10:00:00.000000

Social-login placeholder phones (e.g. "google_<hex>") were hitting the
VARCHAR(20) limit. Widening to VARCHAR(50) gives enough headroom for all
provider prefixes plus a token_hex(4) suffix, and leaves room for real
phone numbers in international format.
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260321_1000"
down_revision = "20260320_1200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "users",
        "phone",
        type_=sa.String(50),
        existing_type=sa.String(20),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "users",
        "phone",
        type_=sa.String(20),
        existing_type=sa.String(50),
        existing_nullable=True,
    )
