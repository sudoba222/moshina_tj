"""add_last_login_at_to_users

Revision ID: 20260402_1000
Revises: 20260331_1200
Create Date: 2026-04-02 10:00:00.000000+00:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '20260402_1000'
down_revision: Union[str, None] = '20260331_1200'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('last_login_at', sa.TIMESTAMP(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('users', 'last_login_at')
