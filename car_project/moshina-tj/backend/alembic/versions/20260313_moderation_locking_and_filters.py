"""add listing locking and session filters

Revision ID: f1a2b3c4d5e6
Revises: e5f6a7b8c9d0
Create Date: 2026-03-13
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'f1a2b3c4d5e6'
down_revision = 'e5f6a7b8c9d0'
branch_labels = None
depends_on = None

def upgrade():
    # Listing locking — prevents two moderators getting the same post
    op.add_column('listings', sa.Column('locked_by', UUID(as_uuid=True), nullable=True))
    op.add_column('listings', sa.Column('locked_at', sa.TIMESTAMP(timezone=True), nullable=True))
    op.create_index('ix_listings_locked_by', 'listings', ['locked_by'])

    # Session filter columns
    op.add_column('moderation_sessions', sa.Column('timer_minutes', sa.Integer(), nullable=True))
    op.add_column('moderation_sessions', sa.Column('filter_date_from', sa.TIMESTAMP(timezone=True), nullable=True))
    op.add_column('moderation_sessions', sa.Column('filter_date_to', sa.TIMESTAMP(timezone=True), nullable=True))
    op.add_column('moderation_sessions', sa.Column('filter_type', sa.String(20), nullable=True))   # 'sale','rent', or None=all
    op.add_column('moderation_sessions', sa.Column('filter_city', sa.String(100), nullable=True))
    op.add_column('moderation_sessions', sa.Column('filter_brand', sa.String(100), nullable=True))
    op.add_column('moderation_sessions', sa.Column('auto_ended', sa.Boolean(), server_default='false', nullable=False))

def downgrade():
    op.drop_index('ix_listings_locked_by', 'listings')
    op.drop_column('listings', 'locked_by')
    op.drop_column('listings', 'locked_at')
    op.drop_column('moderation_sessions', 'timer_minutes')
    op.drop_column('moderation_sessions', 'filter_date_from')
    op.drop_column('moderation_sessions', 'filter_date_to')
    op.drop_column('moderation_sessions', 'filter_type')
    op.drop_column('moderation_sessions', 'filter_city')
    op.drop_column('moderation_sessions', 'filter_brand')
    op.drop_column('moderation_sessions', 'auto_ended')
