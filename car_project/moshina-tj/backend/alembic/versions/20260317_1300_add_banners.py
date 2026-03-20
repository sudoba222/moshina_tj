"""add banners table

Revision ID: 20260317_1300
Revises: 20260317_1200
Create Date: 2026-03-17 13:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '20260317_1300'
down_revision = '20260317_1200'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'banners',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('title_ru', sa.String(200), nullable=False),
        sa.Column('title_tj', sa.String(200), nullable=False),
        sa.Column('subtitle_ru', sa.String(300), nullable=True),
        sa.Column('subtitle_tj', sa.String(300), nullable=True),
        sa.Column('image_url', sa.String(500), nullable=False),
        sa.Column('link_url', sa.String(500), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade():
    op.drop_table('banners')
