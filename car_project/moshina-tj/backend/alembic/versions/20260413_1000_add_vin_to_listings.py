"""add vin and vin_verified to listings

Revision ID: 20260413_1000
Revises: 20260410_1200
Create Date: 2026-04-13 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '20260413_1000'
down_revision = '20260410_1200'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('listings', sa.Column('vin', sa.String(17), nullable=True))
    op.add_column('listings', sa.Column('vin_verified', sa.Boolean(), nullable=False, server_default='false'))
    # Unique index — no two listings can share the same VIN
    op.create_index('ix_listings_vin', 'listings', ['vin'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_listings_vin', table_name='listings')
    op.drop_column('listings', 'vin_verified')
    op.drop_column('listings', 'vin')
