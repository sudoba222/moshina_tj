"""Background tasks that run on a schedule.

Currently:
  - expire_old_drafts: soft-deletes draft listings older than DRAFT_TTL_DAYS.

Wired into FastAPI via the lifespan in main.py using asyncio.create_task.
"""
import asyncio
import logging
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

# Draft listings older than this many days are auto-expired (soft-deleted).
DRAFT_TTL_DAYS = 30

# How often the expiry task runs.
_RUN_INTERVAL_SECONDS = 60 * 60 * 6  # every 6 hours


async def expire_old_drafts() -> None:
    """Soft-delete draft listings that have not been submitted within DRAFT_TTL_DAYS.

    Runs in an infinite loop with _RUN_INTERVAL_SECONDS sleep between passes.
    On error the exception is logged and the loop continues — a single failure
    must never crash the server.
    """
    logger.info("Draft TTL task started (TTL=%d days, interval=%ds)", DRAFT_TTL_DAYS, _RUN_INTERVAL_SECONDS)
    while True:
        try:
            _run_expire_pass()
        except Exception:
            logger.exception("expire_old_drafts: unexpected error — will retry next interval")
        await asyncio.sleep(_RUN_INTERVAL_SECONDS)


def _run_expire_pass() -> None:
    """Execute one sweep: find stale drafts and soft-delete them.

    Opens its own DB session so the task is independent of the request lifecycle.
    """
    from app.database import SessionLocal
    from app.models import Listing, ListingStatus

    cutoff = datetime.now(timezone.utc) - timedelta(days=DRAFT_TTL_DAYS)
    db = SessionLocal()
    try:
        stale = (
            db.query(Listing)
            .filter(
                Listing.status == ListingStatus.draft,
                Listing.is_deleted == False,  # noqa: E712
                Listing.created_at < cutoff,
            )
            .all()
        )
        if not stale:
            logger.debug("expire_old_drafts: no stale drafts found")
            return

        count = 0
        for listing in stale:
            listing.is_deleted = True
            count += 1

        db.commit()
        logger.info("expire_old_drafts: soft-deleted %d stale draft(s)", count)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
