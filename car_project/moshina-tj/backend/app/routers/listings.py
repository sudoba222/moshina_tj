import asyncio
import logging
import math
import time
from decimal import Decimal
from typing import Any, Dict, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from pydantic import BaseModel
from sqlalchemy import func, update
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user, get_current_user_optional

# 2-minute in-memory cache for featured listings (homepage hit on every page load)
_featured_cache: Dict[str, Any] = {}
_FEATURED_CACHE_TTL = 120  # seconds
from app.database import SessionLocal, get_db
from app.models import Currency, Dealer, DealerSubscription, Favorite, FuelType, Listing, ListingImage, ListingLog, ListingStatus, ListingType, Notification, NotificationType, TransmissionType, User, UserRole
from app.schemas import (
    ApiResponse,
    ListingCreate,
    ListingListResponse,
    ListingResponse,
    ListingUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/listings", tags=["listings"])
limiter = Limiter(key_func=get_remote_address)

_MAX_LIMIT = 100


# ---------------------------------------------------------------------------
# Background task: notify dealer subscribers of a new listing
# ---------------------------------------------------------------------------

def _notify_dealer_subscribers(
    dealer_user_id: str,
    listing_id: str,
    brand: str,
    model: str,
    year: int,
    price: str,
    currency: str,
) -> None:
    """Create in-app Notification records for all subscribers of this dealer.

    Also pushes a real-time WebSocket event for online subscribers.
    Runs as a FastAPI BackgroundTask (sync function, separate from request).
    """
    from app.websockets import manager as ws_manager

    db = SessionLocal()
    try:
        dealer = db.query(Dealer).filter(Dealer.user_id == dealer_user_id).first()
        if not dealer:
            return

        dealer_name = dealer.business_name
        dealer_id = dealer.id

        subs = (
            db.query(DealerSubscription)
            .filter(DealerSubscription.dealer_id == dealer_id)
            .all()
        )
        if not subs:
            return

        title = f"Новое объявление от {dealer_name}"
        body = f"{brand} {model} {year} — {price} {currency}"
        link = f"/car/{listing_id}"

        notifications = []
        for sub in subs:
            n = Notification(
                user_id=sub.user_id,
                type=NotificationType.dealer_post,
                title=title,
                body=body,
                link=link,
            )
            db.add(n)
            notifications.append((str(sub.user_id), n))

        db.commit()

        # Push real-time events to online subscribers
        ws_payload = {
            "event": "dealer_post",
            "notification": {
                "type": NotificationType.dealer_post.value,
                "title": title,
                "body": body,
                "link": link,
            },
        }

        loop = asyncio.new_event_loop()
        try:
            subscriber_ids = [uid for uid, _ in notifications]
            loop.run_until_complete(
                ws_manager.broadcast_to_users(subscriber_ids, ws_payload)
            )
        finally:
            loop.close()

    except Exception:
        logger.exception("_notify_dealer_subscribers failed for listing_id=%s", listing_id)
    finally:
        db.close()


def _get_listing_or_404(listing_id: str, db: Session) -> Listing:
    listing = (
        db.query(Listing)
        .options(joinedload(Listing.images), joinedload(Listing.user))
        .filter(Listing.id == listing_id)
        .first()
    )
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    return listing


def _assert_owner_or_admin(listing: Listing, current_user: User) -> None:
    if listing.user_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this listing",
        )


@router.get("", response_model=ApiResponse[ListingListResponse])
def list_listings(
    db: Session = Depends(get_db),
    type: Optional[ListingType] = None,
    city: Optional[str] = None,
    brand: Optional[str] = None,
    model: Optional[str] = None,
    min_price: Optional[Decimal] = None,
    max_price: Optional[Decimal] = None,
    min_year: Optional[int] = None,
    max_year: Optional[int] = None,
    max_mileage: Optional[int] = None,
    color: Optional[str] = None,
    installment: Optional[bool] = None,
    fuel: Optional[FuelType] = None,
    transmission: Optional[TransmissionType] = None,
    currency: Optional[Currency] = None,
    sort: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=_MAX_LIMIT),
):
    query = (
        db.query(Listing)
        .options(joinedload(Listing.images), joinedload(Listing.user))
        .filter(Listing.status == ListingStatus.active)
    )

    if type:
        query = query.filter(Listing.type == type)
    if city:
        query = query.filter(Listing.city.ilike(f"%{city}%"))
    if brand:
        query = query.filter(Listing.brand.ilike(f"%{brand}%"))
    if model:
        query = query.filter(Listing.model.ilike(f"%{model}%"))
    if min_price is not None:
        query = query.filter(Listing.price >= min_price)
    if max_price is not None:
        query = query.filter(Listing.price <= max_price)
    if min_year is not None:
        query = query.filter(Listing.year >= min_year)
    if max_year is not None:
        query = query.filter(Listing.year <= max_year)
    if max_mileage is not None:
        query = query.filter(Listing.mileage <= max_mileage)
    if color:
        query = query.filter(Listing.color.ilike(f"%{color}%"))
    if installment is not None:
        query = query.filter(Listing.installment_available == installment)
    if fuel:
        query = query.filter(Listing.fuel == fuel)
    if transmission:
        query = query.filter(Listing.transmission == transmission)
    if currency:
        query = query.filter(Listing.currency == currency)

    # Sorting
    if sort == "price_asc":
        query = query.order_by(Listing.price.asc())
    elif sort == "price_desc":
        query = query.order_by(Listing.price.desc())
    elif sort == "views":
        query = query.order_by(Listing.views.desc())
    else:
        query = query.order_by(Listing.created_at.desc())

    total = query.count()
    pages = math.ceil(total / limit) if total > 0 else 1
    items = (
        query
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return ApiResponse(
        success=True,
        data=ListingListResponse(
            items=[ListingResponse.model_validate(item) for item in items],
            total=total,
            page=page,
            pages=pages,
        ),
        message="Listings fetched",
    )


@router.get("/featured", response_model=ApiResponse[list[ListingResponse]])
def featured_listings(db: Session = Depends(get_db)):
    now = time.monotonic()
    cached = _featured_cache.get("data")
    if cached and now - _featured_cache.get("ts", 0) < _FEATURED_CACHE_TTL:
        return ApiResponse(success=True, data=cached, message="Featured listings fetched")

    listings = (
        db.query(Listing)
        .options(joinedload(Listing.images), joinedload(Listing.user))
        .filter(Listing.status == ListingStatus.active)
        .order_by(Listing.views.desc())
        .limit(8)
        .all()
    )
    data = [ListingResponse.model_validate(l) for l in listings]
    _featured_cache["data"] = data
    _featured_cache["ts"] = now
    return ApiResponse(success=True, data=data, message="Featured listings fetched")


@router.get("/{listing_id}", response_model=ApiResponse[ListingResponse])
def get_listing(
    listing_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
):
    listing = _get_listing_or_404(listing_id, db)

    # Non-active listings are only visible to their owner or staff
    if listing.status != ListingStatus.active:
        is_owner = current_user and current_user.id == listing.user_id
        is_staff = current_user and current_user.role in (
            UserRole.admin, UserRole.moderator, UserRole.manager, UserRole.support
        )
        if not (is_owner or is_staff):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    # Atomic view increment — avoids a read-modify-write race condition
    # Only count views for publicly active listings
    if listing.status == ListingStatus.active:
        db.execute(
            update(Listing)
            .where(Listing.id == listing_id)
            .values(views=Listing.views + 1)
        )
        db.commit()
        db.refresh(listing)

    data = ListingResponse.model_validate(listing)
    data.moderator_note = None  # internal field — strip from public response
    return ApiResponse(success=True, data=data, message="Listing fetched")


@router.post("", response_model=ApiResponse[ListingResponse], status_code=status.HTTP_201_CREATED)
@limiter.limit("10/hour")
def create_listing(
    request: Request,
    payload: ListingCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    is_dealer = (
        current_user.dealer_profile is not None
        and current_user.dealer_profile.verified
    )

    # Per-user listing creation limit
    if current_user.role not in (UserRole.admin, UserRole.moderator, UserRole.manager, UserRole.support):
        active_count = (
            db.query(func.count(Listing.id))
            .filter(
                Listing.user_id == current_user.id,
                Listing.status.in_([ListingStatus.pending, ListingStatus.active])
            )
            .scalar()
        )
        limit = 50 if is_dealer else 5
        if active_count >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Listing limit reached ({limit}). Remove or wait for existing listings to be processed.",
            )

    listing = Listing(
        user_id=current_user.id,
        type=payload.type,
        brand=payload.brand,
        model=payload.model,
        year=payload.year,
        price=payload.price,
        currency=payload.currency,
        mileage=payload.mileage,
        fuel=payload.fuel,
        transmission=payload.transmission,
        color=payload.color,
        city=payload.city,
        description=payload.description,
        installment_available=payload.installment_available,
        is_dealer_listing=is_dealer,
        rental_rules=payload.rental_rules.model_dump(mode="json") if payload.rental_rules else None,
        status=ListingStatus.pending,
        is_active=False,
    )
    db.add(listing)
    db.flush()  # Get listing.id before committing

    for index, url in enumerate(payload.image_urls):
        url_str = str(url)
        # Extract cloudinary public_id from URL if it's a Cloudinary URL
        cloudinary_id: str | None = None
        if "cloudinary.com" in url_str:
            # URL format: .../upload/v{version}/{public_id}.{ext}
            try:
                path = url_str.split("/upload/", 1)[1]
                # Strip version segment (v1234567890/)
                if path.startswith("v") and "/" in path:
                    path = path.split("/", 1)[1]
                cloudinary_id = path.rsplit(".", 1)[0]  # remove extension
            except Exception:
                pass
        image = ListingImage(
            listing_id=listing.id,
            url=url_str,
            cloudinary_id=cloudinary_id,
            is_primary=(index == 0),
            order_index=index,
        )
        db.add(image)

    db.commit()
    db.refresh(listing)

    # Record creation in the listing audit log
    db.add(ListingLog(
        listing_id=listing.id,
        actor_id=current_user.id,
        action="created",
        from_status=None,
        to_status="pending",
    ))
    db.commit()

    # If this is a verified dealer listing, notify their subscribers asynchronously
    if listing.is_dealer_listing:
        background_tasks.add_task(
            _notify_dealer_subscribers,
            str(current_user.id),
            str(listing.id),
            listing.brand,
            listing.model,
            listing.year,
            str(listing.price),
            listing.currency.value,
        )

    return ApiResponse(
        success=True,
        data=ListingResponse.model_validate(listing),
        message="Listing created",
    )


@router.put("/{listing_id}", response_model=ApiResponse[ListingResponse])
def update_listing(
    listing_id: str,
    payload: ListingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    listing = _get_listing_or_404(listing_id, db)
    _assert_owner_or_admin(listing, current_user)

    update_data = payload.model_dump(exclude_unset=True, mode="json")
    for field, value in update_data.items():
        # rental_rules arrives as a JSON-serializable dict — assign directly
        setattr(listing, field, value)

    # Re-submit for moderation whenever an active listing is edited
    if listing.status == ListingStatus.active:
        listing.status = ListingStatus.pending
        listing.is_active = False
        db.add(ListingLog(
            listing_id=listing.id,
            actor_id=current_user.id,
            action="edited",
            from_status="active",
            to_status="pending",
        ))

    db.commit()
    db.refresh(listing)

    return ApiResponse(
        success=True,
        data=ListingResponse.model_validate(listing),
        message="Listing updated",
    )


@router.put("/{listing_id}/activate", response_model=ApiResponse[ListingResponse])
def activate_listing(
    listing_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    listing = _get_listing_or_404(listing_id, db)
    _assert_owner_or_admin(listing, current_user)
    listing.is_active = True
    db.commit()
    db.refresh(listing)
    return ApiResponse(success=True, data=ListingResponse.model_validate(listing), message="Listing activated")


@router.put("/{listing_id}/deactivate", response_model=ApiResponse[ListingResponse])
def deactivate_listing(
    listing_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    listing = _get_listing_or_404(listing_id, db)
    _assert_owner_or_admin(listing, current_user)
    listing.is_active = False
    db.commit()
    db.refresh(listing)
    return ApiResponse(success=True, data=ListingResponse.model_validate(listing), message="Listing deactivated")


@router.delete("/{listing_id}", response_model=ApiResponse[None])
def delete_listing(
    listing_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    listing = _get_listing_or_404(listing_id, db)
    _assert_owner_or_admin(listing, current_user)

    listing.is_active = False
    db.commit()

    return ApiResponse(success=True, data=None, message="Listing deactivated")


# ---------------------------------------------------------------------------
# Favorites
# ---------------------------------------------------------------------------

class FavoriteToggleResponse(BaseModel):
    favorited: bool


@router.post("/{listing_id}/favorite", response_model=ApiResponse[FavoriteToggleResponse])
def toggle_favorite(
    listing_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Toggle favorite for the current user. Returns favorited=True if added, False if removed."""
    # Verify listing exists
    _get_listing_or_404(listing_id, db)

    existing = (
        db.query(Favorite)
        .filter(Favorite.user_id == current_user.id, Favorite.listing_id == listing_id)
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()
        return ApiResponse(success=True, data=FavoriteToggleResponse(favorited=False), message="Removed from favorites")
    else:
        fav = Favorite(user_id=current_user.id, listing_id=listing_id)
        db.add(fav)
        db.commit()
        return ApiResponse(success=True, data=FavoriteToggleResponse(favorited=True), message="Added to favorites")
