"""enable pg_trgm and fuzzystrmatch extensions for fuzzy search

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-03-13
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic
revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # pg_trgm: provides similarity(), word_similarity(), and trigram GIN/GIST indexes.
    # fuzzystrmatch: provides levenshtein() for edit-distance "did you mean?" logic.
    # Both are bundled with every standard PostgreSQL installation — no extra packages
    # are required on the database host.
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute("CREATE EXTENSION IF NOT EXISTS fuzzystrmatch")


def downgrade() -> None:
    # Dropping extensions that may be used by other objects is intentionally a no-op
    # in downgrade to avoid accidentally breaking other parts of the schema.
    # Remove manually if you are certain nothing else depends on them.
    pass
