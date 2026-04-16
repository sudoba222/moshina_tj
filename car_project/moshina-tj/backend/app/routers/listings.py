import asyncio
import logging
import math
import time
from decimal import Decimal
from typing import Any, Dict, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from app.limiter import limiter
from pydantic import BaseModel
from sqlalchemy import func, update
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user, get_current_user_optional
from app.services import image_service
from app.services.ranking import compute_ranking_score
from app.services.telegram_notifier import send_telegram_notification, notify_admin_new_listing

# 2-minute in-memory cache for featured listings (homepage hit on every page load)
_featured_cache: Dict[str, Any] = {}
_FEATURED_CACHE_TTL = 120  # seconds
from app.database import SessionLocal, get_db
from app.models import AvailabilityStatus, BodyType, Category, Currency, Dealer, DealerSubscription, Favorite, FuelType, Listing, ListingImage, ListingLog, ListingStatus, ListingType, Notification, NotificationType, TransmissionType, User, UserRole
from app.schemas import (
    ApiResponse,
    ListingCreate,
    ListingListResponse,
    ListingResponse,
    ListingUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/listings", tags=["listings"])

_MAX_LIMIT = 100


def _extract_cloudinary_id(url: str) -> str | None:
    """Parse the Cloudinary public_id out of a secure_url.

    Cloudinary URLs look like:
      https://res.cloudinary.com/<cloud>/image/upload/v<version>/<folder>/<public_id>.<ext>
    """
    if "cloudinary.com" not in url:
        return None
    try:
        path = url.split("/upload/", 1)[1]
        # Strip version segment (v1234567890/)
        if path.startswith("v") and "/" in path:
            path = path.split("/", 1)[1]
        return path.rsplit(".", 1)[0]  # remove extension
    except Exception:
        return None


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

        subscriber_ids = [uid for uid, _ in notifications]
        try:
            # Schedule the coroutine on the running event loop (uvicorn's loop).
            # BackgroundTasks run in the same thread as the request handler, so
            # the event loop is already running — use run_coroutine_threadsafe.
            import asyncio as _asyncio
            try:
                loop = _asyncio.get_running_loop()
                _asyncio.run_coroutine_threadsafe(
                    ws_manager.broadcast_to_users(subscriber_ids, ws_payload),
                    loop,
                )
            except RuntimeError:
                logger.warning("No running event loop for WS broadcast to dealer subscribers")
        except Exception:
            logger.exception("WS broadcast failed for listing_id=%s", listing_id)

    except Exception:
        logger.exception("_notify_dealer_subscribers failed for listing_id=%s", listing_id)
    finally:
        db.close()


def _get_listing_or_404(listing_id: str, db: Session) -> Listing:
    listing = (
        db.query(Listing)
        .options(joinedload(Listing.images), joinedload(Listing.user))
        .filter(Listing.id == listing_id, Listing.is_deleted == False)
        .first()
    )
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    return listing


_STAFF_ROLES = {UserRole.admin, UserRole.moderator, UserRole.manager}


def _assert_owner_or_admin(listing: Listing, current_user: User) -> None:
    if listing.user_id != current_user.id and current_user.role not in _STAFF_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this listing",
        )


@router.get("", response_model=ApiResponse[ListingListResponse])
@limiter.limit("120/minute")
def list_listings(
    request: Request,
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
    body_type: Optional[BodyType] = None,
    availability: Optional[AvailabilityStatus] = None,
    currency: Optional[Currency] = None,
    category_slug: Optional[str] = None,
    sort: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=_MAX_LIMIT),
):
    query = (
        db.query(Listing)
        .options(joinedload(Listing.images), joinedload(Listing.user))
        .filter(
            Listing.status == ListingStatus.active,
            Listing.is_active == True,
            Listing.is_deleted == False,
        )
    )

    if type:
        query = query.filter(Listing.type == type)
    if availability:
        query = query.filter(Listing.availability == availability)
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
    if body_type:
        query = query.filter(Listing.body_type == body_type)
    if currency:
        query = query.filter(Listing.currency == currency)
    if category_slug:
        cat = db.query(Category).filter(Category.slug == category_slug).first()
        if cat:
            query = query.filter(Listing.category_id == cat.id)

    # Sorting
    if sort == "price_asc":
        query = query.order_by(Listing.price.asc(), Listing.ranking_score.desc())
    elif sort == "price_desc":
        query = query.order_by(Listing.price.desc(), Listing.ranking_score.desc())
    elif sort == "views":
        query = query.order_by(Listing.views.desc())
    elif sort == "newest":
        query = query.order_by(Listing.created_at.desc())
    else:
        # Default: ranking score (featured + quality + freshness + engagement)
        query = query.order_by(Listing.ranking_score.desc(), Listing.created_at.desc())

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
@limiter.limit("60/minute")
def featured_listings(request: Request, db: Session = Depends(get_db)):
    now = time.monotonic()
    cached = _featured_cache.get("data")
    if cached and now - _featured_cache.get("ts", 0) < _FEATURED_CACHE_TTL:
        return ApiResponse(success=True, data=cached, message="Featured listings fetched")

    listings = (
        db.query(Listing)
        .options(joinedload(Listing.images), joinedload(Listing.user))
        .filter(
            Listing.status == ListingStatus.active,
            Listing.is_active == True,
            Listing.is_deleted == False,
        )
        .order_by(Listing.is_featured.desc(), Listing.ranking_score.desc())
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

    # Non-active or owner-deactivated listings are only visible to their owner or staff
    if listing.status != ListingStatus.active or not listing.is_active:
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

    # VIN duplicate check — fail fast with a clear 409 instead of a DB constraint error
    if payload.vin:
        existing_vin = db.query(Listing).filter(
            Listing.vin == payload.vin, Listing.is_deleted == False
        ).first()
        if existing_vin:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A listing with this VIN already exists",
            )

    # Resolve category/subcategory slugs to IDs if provided
    category_id = payload.category_id
    subcategory_id = None

    if payload.category_slug:
        cat = db.query(Category).filter(Category.slug == payload.category_slug).first()
        if cat:
            category_id = cat.id
        # If slug not found in DB, silently ignore — category is optional

    if payload.subcategory_slug:
        sub = db.query(Category).filter(Category.slug == payload.subcategory_slug).first()
        if sub:
            subcategory_id = sub.id
        # If slug not found in DB, silently ignore

    listing = Listing(
        user_id=current_user.id,
        category_id=category_id,
        subcategory_id=subcategory_id,
        type=payload.type,
        brand=payload.brand,
        model=payload.model,
        year=payload.year,
        price=payload.price,
        currency=payload.currency,
        is_negotiable=payload.is_negotiable,
        prepayment_amount=payload.prepayment_amount,
        mileage=payload.mileage,
        fuel=payload.fuel,
        transmission=payload.transmission,
        body_type=payload.body_type,
        drive_type=payload.drive_type,
        engine_volume=payload.engine_volume,
        has_turbine=payload.has_turbine,
        condition=payload.condition,
        is_customs_cleared=payload.is_customs_cleared,
        taxi_license=payload.taxi_license,
        color=payload.color,
        city=payload.city,
        description=payload.description,
        
        # Social & Video
        youtube_link=payload.youtube_link,
        tiktok_link=payload.tiktok_link,
        video_url=payload.video_url,

        # Contact Info
        contact_name=payload.contact_name,
        contact_email=payload.contact_email,
        contact_phone=payload.contact_phone,
        contact_method=payload.contact_method,
        whatsapp_number=payload.whatsapp_number,

        availability=payload.availability,
        installment_available=payload.installment_available,
        is_dealer_listing=is_dealer,
        rental_rules=payload.rental_rules.model_dump(mode="json") if payload.rental_rules else None,
        vin=payload.vin,
        status=ListingStatus.pending,
        is_active=False,
    )
    db.add(listing)
    db.flush()  # Get listing.id before committing

    for index, url in enumerate(payload.image_urls):
        url_str = str(url)
        image = ListingImage(
            listing_id=listing.id,
            url=url_str,
            cloudinary_id=_extract_cloudinary_id(url_str),
            is_primary=(index == 0),
            order_index=index,
        )
        db.add(image)

    db.commit()
    db.refresh(listing)

    # Compute initial ranking score (images are now loaded after refresh)
    listing.ranking_score = compute_ranking_score(listing)
    db.commit()

    # Record creation in the listing audit log
    db.add(ListingLog(
        listing_id=listing.id,
        actor_id=current_user.id,
        action="created",
        from_status=None,
        to_status="pending",
    ))
    db.commit()

    # Telegram: notify user their listing is under moderation
    car_name = f"{listing.brand} {listing.model} {listing.year}"
    if current_user.telegram_chat_id:
        background_tasks.add_task(
            send_telegram_notification,
            current_user.id,
            "listing_pending",
            {"car_name": car_name, "listing_id": str(listing.id)},
        )

    # Telegram: notify admin/support chat that a new listing needs review
    background_tasks.add_task(
        notify_admin_new_listing,
        car_name,
        str(listing.id),
        current_user.name or current_user.phone or "User",
        current_user.phone,
    )

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
@limiter.limit("30/minute")
def update_listing(
    request: Request,
    listing_id: str,
    payload: ListingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    listing = _get_listing_or_404(listing_id, db)
    _assert_owner_or_admin(listing, current_user)

    # VIN duplicate check on update — exclude current listing
    if payload.vin and payload.vin != listing.vin:
        existing_vin = db.query(Listing).filter(
            Listing.vin == payload.vin,
            Listing.id != listing.id,
            Listing.is_deleted == False,
        ).first()
        if existing_vin:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A listing with this VIN already exists",
            )

    update_data = payload.model_dump(exclude_unset=True, mode="json")

    # Handle image replacement — must happen before the generic field loop so
    # that image_urls doesn't get blindly setattr'd onto the ORM model.
    new_image_urls: list[str] | None = update_data.pop("image_urls", None)
    if new_image_urls is not None:
        existing_images = (
            db.query(ListingImage)
            .filter(ListingImage.listing_id == listing.id)
            .all()
        )
        new_url_set = set(new_image_urls)

        # Delete images that are no longer in the new set
        for img in existing_images:
            if img.url not in new_url_set:
                if img.cloudinary_id:
                    try:
                        image_service.delete_image(img.cloudinary_id)
                    except Exception:
                        logger.exception("Failed to delete Cloudinary image %s", img.cloudinary_id)
                db.delete(img)

        # Add images that are newly introduced
        existing_url_set = {img.url for img in existing_images}
        for index, url_str in enumerate(new_image_urls):
            if url_str not in existing_url_set:
                db.add(ListingImage(
                    listing_id=listing.id,
                    url=url_str,
                    cloudinary_id=_extract_cloudinary_id(url_str),
                    is_primary=(index == 0),
                    order_index=index,
                ))
            else:
                # Update order and primary flag for retained images
                for img in existing_images:
                    if img.url == url_str:
                        img.order_index = index
                        img.is_primary = (index == 0)
                        break

    # Resolve slugs to IDs if provided in update
    if "category_slug" in update_data:
        cat_slug = update_data.pop("category_slug")
        if cat_slug is not None:
            cat = db.query(Category).filter(Category.slug == cat_slug).first()
            if cat:
                update_data["category_id"] = cat.id

    if "subcategory_slug" in update_data:
        sub_slug = update_data.pop("subcategory_slug")
        if sub_slug is not None:
            sub = db.query(Category).filter(Category.slug == sub_slug).first()
            if sub:
                update_data["subcategory_id"] = sub.id

    _USER_SETTABLE_LISTING_FIELDS = frozenset({
        "category_id", "subcategory_id", "type", "brand", "model", "year", "price", "currency",
        "is_negotiable", "prepayment_amount", "mileage", "fuel", "transmission",
        "body_type", "drive_type", "engine_volume", "has_turbine", "condition",
        "is_customs_cleared", "taxi_license", "color", "city", "description",
        "youtube_link", "tiktok_link", "video_url", "contact_name", "contact_email",
        "contact_phone", "contact_method", "whatsapp_number", "installment_available",
        "availability", "rental_rules", "vin",
    })
    for field, value in update_data.items():
        if field not in _USER_SETTABLE_LISTING_FIELDS:
            continue
        # rental_rules arrives as a JSON-serializable dict — assign directly
        setattr(listing, field, value)

    # Re-submit for moderation whenever an edited listing had been active or rejected
    if listing.status in (ListingStatus.active, ListingStatus.rejected):
        old_status = listing.status  # Capture before mutation so the log is accurate
        listing.status = ListingStatus.pending
        listing.is_active = False
        listing.rejection_reason = None  # Clear stale rejection reason on resubmit
        db.add(ListingLog(
            listing_id=listing.id,
            actor_id=current_user.id,
            action="edited",
            from_status=old_status.value,
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
    if listing.status != ListingStatus.active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only approved listings can be re-activated. Rejected or pending listings must go through review.",
        )
    listing.is_active = True
    db.commit()
    _featured_cache.clear()
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
    if listing.status != ListingStatus.active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only active listings can be deactivated.",
        )
    listing.is_active = False
    db.commit()
    _featured_cache.clear()
    db.refresh(listing)
    return ApiResponse(success=True, data=ListingResponse.model_validate(listing), message="Listing deactivated")


@router.delete("/{listing_id}", response_model=ApiResponse[None])
def delete_listing(
    listing_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    listing = _get_listing_or_404(listing_id, db)
    _assert_owner_or_admin(listing, current_user)

    # Collect cloudinary_ids before soft-delete so background task can clean up
    cloudinary_ids = [
        img.cloudinary_id
        for img in db.query(ListingImage).filter(ListingImage.listing_id == listing.id).all()
        if img.cloudinary_id
    ]

    prev_status = listing.status.value if listing.status else None
    listing.is_deleted = True
    listing.is_active = False
    listing.status = ListingStatus.rejected  # Remove from all public feeds immediately
    db.add(ListingLog(
        listing_id=listing.id,
        actor_id=current_user.id,
        action="deleted",
        from_status=prev_status,
        to_status="deleted",
    ))
    db.commit()
    _featured_cache.clear()

    # Delete images from storage in the background — don't block the response
    if cloudinary_ids:
        background_tasks.add_task(_delete_images_background, cloudinary_ids)

    return ApiResponse(success=True, data=None, message="Listing deleted")


def _delete_images_background(cloudinary_ids: list[str]) -> None:
    for cid in cloudinary_ids:
        try:
            image_service.delete_image(cid)
        except Exception:
            logger.exception("Failed to delete Cloudinary image %s in background", cid)


# ---------------------------------------------------------------------------
# Favorites
# ---------------------------------------------------------------------------

class FavoriteToggleResponse(BaseModel):
    favorited: bool


@router.post("/{listing_id}/favorite", response_model=ApiResponse[FavoriteToggleResponse])
@limiter.limit("60/minute")
def toggle_favorite(
    request: Request,
    listing_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Toggle favorite for the current user. Returns favorited=True if added, False if removed."""
    listing = _get_listing_or_404(listing_id, db)

    existing = (
        db.query(Favorite)
        .filter(Favorite.user_id == current_user.id, Favorite.listing_id == listing_id)
        .first()
    )
    if existing:
        db.delete(existing)
        db.execute(
            update(Listing)
            .where(Listing.id == listing_id)
            .values(favorites_count=func.greatest(0, Listing.favorites_count - 1))
        )
        db.commit()
        return ApiResponse(success=True, data=FavoriteToggleResponse(favorited=False), message="Removed from favorites")
    else:
        fav = Favorite(user_id=current_user.id, listing_id=listing_id)
        db.add(fav)
        db.execute(
            update(Listing)
            .where(Listing.id == listing_id)
            .values(favorites_count=Listing.favorites_count + 1)
        )
        db.commit()
        return ApiResponse(success=True, data=FavoriteToggleResponse(favorited=True), message="Added to favorites")
