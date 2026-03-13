"""add rental_rules column and new userrole enum values

Revision ID: a1b2c3d4e5f6
Revises: 7d41cca118aa
Create Date: 2026-03-13 00:00:00.000000+00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "7d41cca118aa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # -----------------------------------------------------------------------
    # Extend the userrole PostgreSQL enum with new values.
    # ALTER TYPE … ADD VALUE is transactional in PG 12+ but cannot run inside
    # an explicit transaction block in older versions.  Using IF NOT EXISTS
    # makes the migration idempotent.
    # -----------------------------------------------------------------------
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'moderator'")
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'manager'")
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'support'")

    # -----------------------------------------------------------------------
    # Add rental_rules JSON column to listings
    # -----------------------------------------------------------------------
    op.add_column(
        "listings",
        sa.Column(
            "rental_rules",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=True,
        ),
    )


def downgrade() -> None:
    # Drop the rental_rules column — straightforward
    op.drop_column("listings", "rental_rules")

    # PostgreSQL does not support removing enum values (no DROP VALUE).
    # The moderator / manager / support values will remain in the DB enum
    # but are harmless as long as no rows reference them.
    # To fully revert you would need to recreate the enum without those values
    # and update all columns that reference it — out of scope for this migration.
