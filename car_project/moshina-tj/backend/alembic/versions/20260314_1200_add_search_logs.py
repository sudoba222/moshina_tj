"""add_search_logs table

Revision ID: a1b2c3d4e5f6
Revises: 803794f10318
Create Date: 2026-03-14 12:00:00.000000+00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = 'd9e8f7a6b5c4'
down_revision: Union[str, None] = '803794f10318'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'search_logs',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('query', sa.String(500), nullable=False, index=True),
        sa.Column('results_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('ix_search_logs_created_at', 'search_logs', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_search_logs_created_at', table_name='search_logs')
    op.drop_table('search_logs')
