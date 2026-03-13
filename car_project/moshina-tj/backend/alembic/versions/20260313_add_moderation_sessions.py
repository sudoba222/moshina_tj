"""add moderation sessions table

Revision ID: e5f6a7b8c9d0
Revises: c3d4e5f6a7b8
Create Date: 2026-03-13
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'e5f6a7b8c9d0'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'moderation_sessions',
        sa.Column('id', UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('moderator_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('started_at', sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('ended_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('posts_approved', sa.Integer(), server_default='0', nullable=False),
        sa.Column('posts_rejected', sa.Integer(), server_default='0', nullable=False),
        sa.Column('posts_skipped', sa.Integer(), server_default='0', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
    )
    op.create_index('ix_moderation_sessions_moderator_id', 'moderation_sessions', ['moderator_id'])


def downgrade():
    op.drop_index('ix_moderation_sessions_moderator_id', table_name='moderation_sessions')
    op.drop_table('moderation_sessions')
