"""Public marketplace statistics endpoint — no auth required."""
import time
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import distinct, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Dealer, Listing, ListingStatus, User
from app.schemas import ApiResponse
from app.redis_client import cache_get, cache_set

router = APIRouter(prefix="/stats", tags=["stats"])

# ---------------------------------------------------------------------------
# Caching strategy:
# Primary  — Redis (shared across all workers, 5-minute TTL).
# Fallback — per-worker in-memory cache (2-minute TTL).
# Stats are displayed on the homepage hero section and called on every page
# load. A short TTL is imperceptible to users but eliminates heavy COUNT(*)
# queries per visitor.
# ---------------------------------------------------------------------------
_REDIS_CACHE_KEY = "stats:marketplace"
_REDIS_CACHE_TTL = 300  # 5 minutes

_stats_cache: Dict[str, Any] = {}
_STATS_CACHE_TTL = 120  # 2 minutes (in-memory fallback)


class MarketplaceStats(BaseModel):
    listings_count: int
    dealers_count: int
    cities_count: int
    users_count: int


@router.get("", response_model=ApiResponse[MarketplaceStats])
async def get_stats(db: Session = Depends(get_db)) -> ApiResponse[MarketplaceStats]:
    """Return live marketplace counts — cached for 5 minutes in Redis (2 min
    in-process fallback when Redis is unavailable).

    - listings_count: active listings only (status == active)
    - dealers_count:  verified dealers only
    - cities_count:   distinct cities across active listings
    - users_count:    active (non-banned, non-deleted) users
    """
    # 1. Try Redis first (cross-worker shared cache).
    redis_hit = await cache_get(_REDIS_CACHE_KEY)
    if redis_hit is not None:
        return ApiResponse(success=True, data=MarketplaceStats(**redis_hit), message="")

    # 2. Fall back to in-process cache.
    now = time.monotonic()
    if _stats_cache.get("ts") and (now - _stats_cache["ts"]) < _STATS_CACHE_TTL:
        return ApiResponse(success=True, data=_stats_cache["data"], message="")

    # 3. Query the database.
    listings_count: int = (
        db.query(func.count(Listing.id))
        .filter(Listing.status == ListingStatus.active, Listing.is_active == True)
        .scalar()
        or 0
    )

    dealers_count: int = (
        db.query(func.count(Dealer.id))
        .filter(Dealer.verified.is_(True))
        .scalar()
        or 0
    )

    cities_count: int = (
        db.query(func.count(distinct(Listing.city)))
        .filter(Listing.status == ListingStatus.active, Listing.is_active == True)
        .scalar()
        or 0
    )

    users_count: int = (
        db.query(func.count(User.id))
        .filter(User.is_banned.is_(False), User.is_deleted.is_(False))
        .scalar()
        or 0
    )

    data = MarketplaceStats(
        listings_count=listings_count,
        dealers_count=dealers_count,
        cities_count=cities_count,
        users_count=users_count,
    )

    # Populate both caches.
    await cache_set(_REDIS_CACHE_KEY, data.model_dump(), _REDIS_CACHE_TTL)
    _stats_cache["data"] = data
    _stats_cache["ts"] = now

    return ApiResponse(success=True, data=data, message="")
