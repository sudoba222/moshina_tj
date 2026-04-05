"""add subcategory_id to listings

Revision ID: d4e44053afd4
Revises: 20260402_1000
Create Date: 2026-04-04 07:33:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'd4e44053afd4'
down_revision: Union[str, None] = '20260402_1000'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('listings', sa.Column('subcategory_id', sa.UUID(), sa.ForeignKey('categories.id', ondelete='SET NULL'), nullable=True))
    op.create_index(op.f('ix_listings_subcategory_id'), 'listings', ['subcategory_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_listings_subcategory_id'), table_name='listings')
    op.drop_column('listings', 'subcategory_id')
