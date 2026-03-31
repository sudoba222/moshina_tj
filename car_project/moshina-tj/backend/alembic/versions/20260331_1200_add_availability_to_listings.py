"""add_availability_to_listings

Revision ID: 20260331_1200
Revises: 20260327_1100
Create Date: 2026-03-31 12:00:00.000000+00:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '20260331_1200'
down_revision: Union[str, None] = '20260327_1100'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE TYPE availabilitystatus AS ENUM ('in_stock', 'on_order', 'abroad')")
    op.add_column(
        'listings',
        sa.Column(
            'availability',
            sa.Enum('in_stock', 'on_order', 'abroad', name='availabilitystatus'),
            nullable=False,
            server_default='in_stock',
        ),
    )


def downgrade() -> None:
    op.drop_column('listings', 'availability')
    op.execute("DROP TYPE IF EXISTS availabilitystatus")
