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
    conn = op.get_bind()

    # Add vin column only if it doesn't already exist
    result = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name='listings' AND column_name='vin'"
    ))
    if not result.fetchone():
        op.add_column('listings', sa.Column('vin', sa.String(17), nullable=True))

    # Add vin_verified column only if it doesn't already exist
    result = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name='listings' AND column_name='vin_verified'"
    ))
    if not result.fetchone():
        op.add_column('listings', sa.Column('vin_verified', sa.Boolean(), nullable=False, server_default='false'))

    # Create unique index only if it doesn't already exist
    result = conn.execute(sa.text(
        "SELECT 1 FROM pg_indexes "
        "WHERE tablename='listings' AND indexname='ix_listings_vin'"
    ))
    if not result.fetchone():
        op.create_index('ix_listings_vin', 'listings', ['vin'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_listings_vin', table_name='listings')
    op.drop_column('listings', 'vin_verified')
    op.drop_column('listings', 'vin')
