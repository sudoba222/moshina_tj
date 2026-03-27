"""add_is_deleted_to_listings

Revision ID: 20260327_1000
Revises: 70b6228a8c9f
Create Date: 2026-03-27 10:00:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic
revision: str = '20260327_1000'
down_revision: Union[str, None] = '70b6228a8c9f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'listings',
        sa.Column(
            'is_deleted',
            sa.Boolean(),
            nullable=False,
            server_default='false',
        ),
    )
    op.create_index('ix_listings_is_deleted', 'listings', ['is_deleted'])


def downgrade() -> None:
    op.drop_index('ix_listings_is_deleted', table_name='listings')
    op.drop_column('listings', 'is_deleted')
