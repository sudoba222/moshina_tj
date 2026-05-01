"""Performance audit: add missing composite and partial indexes for scale

Revision ID: 20260420_1000
Revises: 20260415_1200
Create Date: 2026-04-20

Indexes added in this migration
--------------------------------
1. ix_listings_status_is_active_is_deleted (status, is_active, is_deleted)
   Every public-facing listing query filters on all three columns simultaneously.
   The existing ix_listings_status_created_at only covers status+created_at;
   adding is_active and is_deleted to a covering composite lets Postgres satisfy
   the WHERE clause without a second bitmap-heap pass.

2. ix_listings_status_is_active_ranking_score (status, is_active, ranking_score DESC)
   The default sort on /listings and /search/recommendations orders by
   ranking_score DESC. Without this, Postgres must sort the result of the
   status+is_active filter in memory — expensive at 10k+ rows.

3. ix_listings_user_id_is_deleted (user_id, is_deleted)
   /users/{id}/listings and /me/listings always filter on user_id + is_deleted
   together. The existing ix_listings_user_id is a single-column index; adding
   is_deleted avoids a recheck filter on the heap.

4. ix_messages_conversation_id_created_at (conversation_id, created_at)
   /conversations/{id}/messages orders by created_at ASC within a
   conversation. The existing ix_messages_conversation_id covers only the FK
   lookup; adding created_at makes ORDER BY + LIMIT use an index-only scan.

5. ix_messages_is_read (is_read)
   mark-as-read bulk UPDATE and unread-count queries filter on is_read=false.

6. ix_notifications_user_id_is_read (user_id, is_read)
   Notification badge counts and unread lists always filter on
   (user_id, is_read=false). The existing ix_notifications_user_id covers
   user_id alone; adding is_read eliminates the filter heap-scan.

7. ix_audit_logs_created_at (created_at)
   /admin/users/{id}/login-history orders by created_at DESC over potentially
   millions of audit rows. Without this index every call sorts the full table.

8. ix_listings_is_deleted (is_deleted)
   Several admin endpoints filter only on is_deleted without a status clause
   (e.g. total_listings count). A dedicated index helps those COUNT queries.
"""
from alembic import op
import sqlalchemy as sa

revision = "20260420_1000"
down_revision = "20260415_1200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    def _idx_exists(name: str) -> bool:
        result = conn.execute(
            sa.text("SELECT 1 FROM pg_indexes WHERE indexname = :n"),
            {"n": name},
        )
        return result.fetchone() is not None

    # 1. Public listing feed — status + is_active + is_deleted
    if not _idx_exists("ix_listings_status_is_active_is_deleted"):
        op.create_index(
            "ix_listings_status_is_active_is_deleted",
            "listings",
            ["status", "is_active", "is_deleted"],
        )

    # 2. Default ranking sort — status + is_active + ranking_score DESC
    if not _idx_exists("ix_listings_status_is_active_ranking_score"):
        op.create_index(
            "ix_listings_status_is_active_ranking_score",
            "listings",
            ["status", "is_active", sa.text("ranking_score DESC")],
        )

    # 3. Per-user listing pages
    if not _idx_exists("ix_listings_user_id_is_deleted"):
        op.create_index(
            "ix_listings_user_id_is_deleted",
            "listings",
            ["user_id", "is_deleted"],
        )

    # 4. Message history — ordered within a conversation
    if not _idx_exists("ix_messages_conversation_id_created_at"):
        op.create_index(
            "ix_messages_conversation_id_created_at",
            "messages",
            ["conversation_id", "created_at"],
        )

    # 5. Unread message filter
    if not _idx_exists("ix_messages_is_read"):
        op.create_index(
            "ix_messages_is_read",
            "messages",
            ["is_read"],
        )

    # 6. Notification badge — user_id + is_read
    if not _idx_exists("ix_notifications_user_id_is_read"):
        op.create_index(
            "ix_notifications_user_id_is_read",
            "notifications",
            ["user_id", "is_read"],
        )

    # 7. Audit log — chronological lookup for login history
    if not _idx_exists("ix_audit_logs_created_at"):
        op.create_index(
            "ix_audit_logs_created_at",
            "audit_logs",
            ["created_at"],
        )

    # 8. Listings — is_deleted for admin-level COUNT queries
    if not _idx_exists("ix_listings_is_deleted"):
        op.create_index(
            "ix_listings_is_deleted",
            "listings",
            ["is_deleted"],
        )


def downgrade() -> None:
    op.drop_index("ix_listings_is_deleted", table_name="listings")
    op.drop_index("ix_audit_logs_created_at", table_name="audit_logs")
    op.drop_index("ix_notifications_user_id_is_read", table_name="notifications")
    op.drop_index("ix_messages_is_read", table_name="messages")
    op.drop_index("ix_messages_conversation_id_created_at", table_name="messages")
    op.drop_index("ix_listings_user_id_is_deleted", table_name="listings")
    op.drop_index("ix_listings_status_is_active_ranking_score", table_name="listings")
    op.drop_index("ix_listings_status_is_active_is_deleted", table_name="listings")
