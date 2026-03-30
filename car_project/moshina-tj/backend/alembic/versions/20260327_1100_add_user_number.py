"""add_user_number_to_users

Revision ID: 20260327_1100
Revises: 20260327_1000
Create Date: 2026-03-27 11:00:00.000000+00:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '20260327_1100'
down_revision: Union[str, None] = '20260327_1000'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create a sequence for user numbers
    op.execute("CREATE SEQUENCE IF NOT EXISTS users_user_number_seq START 1001")
    # Add the column with a default that draws from the sequence
    op.add_column('users', sa.Column(
        'user_number',
        sa.BigInteger(),
        nullable=True,
    ))
    op.execute("UPDATE users SET user_number = nextval('users_user_number_seq')")
    op.alter_column('users', 'user_number', nullable=False)
    op.create_unique_constraint('uq_users_user_number', 'users', ['user_number'])
    op.create_index('ix_users_user_number', 'users', ['user_number'])
    # Set it as default for future inserts
    op.execute("ALTER TABLE users ALTER COLUMN user_number SET DEFAULT nextval('users_user_number_seq')")
    op.execute("ALTER SEQUENCE users_user_number_seq OWNED BY users.user_number")


def downgrade() -> None:
    op.drop_index('ix_users_user_number', table_name='users')
    op.drop_constraint('uq_users_user_number', 'users', type_='unique')
    op.drop_column('users', 'user_number')
    op.execute("DROP SEQUENCE IF EXISTS users_user_number_seq")
