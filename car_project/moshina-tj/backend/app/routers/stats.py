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

router = APIRouter(prefix="/stats", tags=["stats"])

# ---------------------------------------------------------------------------
# In-memory TTL cache — stats are displayed on the homepage hero section and
# called on every page load. A 2-minute TTL is imperceptible to users but
# eliminates 4 COUNT(*) queries per visitor.
# ---------------------------------------------------------------------------
_stats_cache: Dict[str, Any] = {}
_STATS_CACHE_TTL = 120  # 2 minutes


class MarketplaceStats(BaseModel):
    listings_count: int
    dealers_count: int
    cities_count: int
    users_count: int


@router.get("", response_model=ApiResponse[MarketplaceStats])
def get_stats(db: Session = Depends(get_db)) -> ApiResponse[MarketplaceStats]:
    """Return live marketplace counts — cached for 2 minutes.

    - listings_count: active listings only (status == active)
    - dealers_count:  verified dealers only
    - cities_count:   distinct cities across active listings
    - users_count:    active (non-banned, non-deleted) users
    """
    now = time.monotonic()
    if _stats_cache.get("ts") and (now - _stats_cache["ts"]) < _STATS_CACHE_TTL:
        return ApiResponse(success=True, data=_stats_cache["data"], message="")

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
    _stats_cache["data"] = data
    _stats_cache["ts"] = now

    return ApiResponse(success=True, data=data, message="")
