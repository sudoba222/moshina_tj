"""Dealer subscription router.

  POST /dealers/{dealer_id}/subscribe  — toggle subscribe/unsubscribe
  GET  /dealers/{dealer_id}/subscription — check subscription status
  GET  /subscriptions/feed              — listings from followed dealers
  GET  /subscriptions/dealers           — list followed dealers
"""
import math
import uuid as _uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import SessionLocal
from app.limiter import limiter
from app.models import Dealer, DealerSubscription, Listing, ListingStatus, User
from app.schemas import ApiResponse, DealerResponse, ListingListResponse, ListingResponse

router = APIRouter(tags=["subscriptions"])


# ---------------------------------------------------------------------------
# Local response schemas
# ---------------------------------------------------------------------------

class SubscriptionToggleOut(BaseModel):
    subscribed: bool
    count: int


class SubscriptionStatusOut(BaseModel):
    subscribed: bool


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_dealer_or_404(dealer_id: str, db: Session) -> Dealer:
    dealer = db.query(Dealer).filter(Dealer.id == dealer_id).first()
    if not dealer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dealer not found")
    return dealer


# ---------------------------------------------------------------------------
# Toggle subscribe / unsubscribe
# ---------------------------------------------------------------------------

@router.post(
    "/dealers/{dealer_id}/subscribe",
    response_model=ApiResponse[SubscriptionToggleOut],
)
@limiter.limit("30/minute")
def toggle_subscribe(
    request: Request,
    dealer_id: str,
    current_user: User = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        _get_dealer_or_404(dealer_id, db)

        existing = (
            db.query(DealerSubscription)
            .filter(
                DealerSubscription.user_id == current_user.id,
                DealerSubscription.dealer_id == dealer_id,
            )
            .first()
        )

        if existing:
            db.delete(existing)
            db.commit()
            subscribed = False
        else:
            sub = DealerSubscription(
                user_id=current_user.id,
                dealer_id=_uuid.UUID(dealer_id),
            )
            db.add(sub)
            db.commit()
            subscribed = True

        count = (
            db.query(DealerSubscription)
            .filter(DealerSubscription.dealer_id == dealer_id)
            .count()
        )
    finally:
        db.close()

    msg = "Subscribed" if subscribed else "Unsubscribed"
    return ApiResponse(
        success=True,
        data=SubscriptionToggleOut(subscribed=subscribed, count=count),
        message=msg,
    )


# ---------------------------------------------------------------------------
# Check subscription status
# ---------------------------------------------------------------------------

@router.get(
    "/dealers/{dealer_id}/subscription",
    response_model=ApiResponse[SubscriptionStatusOut],
)
def check_subscription(
    dealer_id: str,
    current_user: User = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        _get_dealer_or_404(dealer_id, db)

        exists = (
            db.query(DealerSubscription)
            .filter(
                DealerSubscription.user_id == current_user.id,
                DealerSubscription.dealer_id == dealer_id,
            )
            .first()
        )
        subscribed = exists is not None
    finally:
        db.close()

    return ApiResponse(
        success=True,
        data=SubscriptionStatusOut(subscribed=subscribed),
        message="Subscription status",
    )


# ---------------------------------------------------------------------------
# Feed: listings from followed dealers
# ---------------------------------------------------------------------------

@router.get(
    "/subscriptions/feed",
    response_model=ApiResponse[ListingListResponse],
)
def subscription_feed(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        # Find all dealer_ids this user follows
        subs = (
            db.query(DealerSubscription.dealer_id)
            .filter(DealerSubscription.user_id == current_user.id)
            .all()
        )
        dealer_ids = [row.dealer_id for row in subs]

        if not dealer_ids:
            return ApiResponse(
                success=True,
                data=ListingListResponse(items=[], total=0, page=page, pages=1),
                message="No subscriptions",
            )

        # Find user_ids that own those dealer profiles
        dealer_user_ids = (
            db.query(Dealer.user_id)
            .filter(Dealer.id.in_(dealer_ids))
            .all()
        )
        user_ids = [row.user_id for row in dealer_user_ids]

        base = (
            db.query(Listing)
            .options(joinedload(Listing.images), joinedload(Listing.user))
            .filter(
                Listing.user_id.in_(user_ids),
                Listing.status == ListingStatus.active,
                Listing.is_active == True,
                Listing.is_deleted == False,
            )
            .order_by(Listing.created_at.desc())
        )

        total = base.count()
        pages = math.ceil(total / limit) if total > 0 else 1
        items = base.offset((page - 1) * limit).limit(limit).all()

        data = ListingListResponse(
            items=[ListingResponse.model_validate(l) for l in items],
            total=total,
            page=page,
            pages=pages,
        )
    finally:
        db.close()

    return ApiResponse(success=True, data=data, message="Feed fetched")


# ---------------------------------------------------------------------------
# List followed dealers
# ---------------------------------------------------------------------------

@router.get(
    "/subscriptions/dealers",
    response_model=ApiResponse[list[DealerResponse]],
)
def list_followed_dealers(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        subs = (
            db.query(DealerSubscription)
            .options(joinedload(DealerSubscription.dealer))
            .filter(DealerSubscription.user_id == current_user.id)
            .order_by(DealerSubscription.created_at.desc())
            .all()
        )
        dealers = [DealerResponse.model_validate(s.dealer) for s in subs if s.dealer]
    finally:
        db.close()

    return ApiResponse(success=True, data=dealers, message="Followed dealers fetched")
