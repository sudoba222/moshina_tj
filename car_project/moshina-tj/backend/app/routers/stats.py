"""Public marketplace statistics endpoint — no auth required."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import distinct, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Dealer, Listing, ListingStatus, User
from app.schemas import ApiResponse

router = APIRouter(prefix="/stats", tags=["stats"])


class MarketplaceStats(BaseModel):
    listings_count: int
    dealers_count: int
    cities_count: int
    users_count: int


@router.get("", response_model=ApiResponse[MarketplaceStats])
def get_stats(db: Session = Depends(get_db)) -> ApiResponse[MarketplaceStats]:
    """Return live marketplace counts.

    - listings_count: active listings only (status == active)
    - dealers_count:  verified dealers only
    - cities_count:   distinct cities across active listings
    - users_count:    active (non-banned, non-deleted) users
    """
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

    return ApiResponse(
        success=True,
        data=MarketplaceStats(
            listings_count=listings_count,
            dealers_count=dealers_count,
            cities_count=cities_count,
            users_count=users_count,
        ),
        message="",
    )
