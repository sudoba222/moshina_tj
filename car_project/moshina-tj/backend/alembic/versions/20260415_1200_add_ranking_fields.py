"""add ranking fields to listings

Revision ID: 20260415_1200
Revises: 20260413_1000
Create Date: 2026-04-15 12:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '20260415_1200'
down_revision = '20260413_1000'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # ranking_score
    result = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name='listings' AND column_name='ranking_score'"
    ))
    if not result.fetchone():
        op.add_column('listings', sa.Column(
            'ranking_score',
            sa.Numeric(8, 2),
            nullable=False,
            server_default='0.0',
        ))

    # is_featured
    result = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name='listings' AND column_name='is_featured'"
    ))
    if not result.fetchone():
        op.add_column('listings', sa.Column(
            'is_featured',
            sa.Boolean(),
            nullable=False,
            server_default='false',
        ))

    # featured_until
    result = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name='listings' AND column_name='featured_until'"
    ))
    if not result.fetchone():
        op.add_column('listings', sa.Column(
            'featured_until',
            sa.TIMESTAMP(timezone=True),
            nullable=True,
        ))

    # favorites_count
    result = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name='listings' AND column_name='favorites_count'"
    ))
    if not result.fetchone():
        op.add_column('listings', sa.Column(
            'favorites_count',
            sa.Integer(),
            nullable=False,
            server_default='0',
        ))

    # Index on ranking_score DESC
    result = conn.execute(sa.text(
        "SELECT 1 FROM pg_indexes "
        "WHERE tablename='listings' AND indexname='ix_listings_ranking_score'"
    ))
    if not result.fetchone():
        op.create_index(
            'ix_listings_ranking_score',
            'listings',
            [sa.text('ranking_score DESC')],
        )

    # Composite index on (is_featured, featured_until)
    result = conn.execute(sa.text(
        "SELECT 1 FROM pg_indexes "
        "WHERE tablename='listings' AND indexname='ix_listings_featured'"
    ))
    if not result.fetchone():
        op.create_index(
            'ix_listings_featured',
            'listings',
            ['is_featured', 'featured_until'],
        )


def downgrade() -> None:
    op.drop_index('ix_listings_featured', table_name='listings')
    op.drop_index('ix_listings_ranking_score', table_name='listings')
    op.drop_column('listings', 'favorites_count')
    op.drop_column('listings', 'featured_until')
    op.drop_column('listings', 'is_featured')
    op.drop_column('listings', 'ranking_score')
