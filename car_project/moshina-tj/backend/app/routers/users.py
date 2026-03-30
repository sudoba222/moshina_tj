import math
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user, get_current_user_optional
from app.database import get_db
from app.models import Favorite, Listing, ListingStatus, User, UserRole
from app.schemas import ApiResponse, ListingListResponse, ListingResponse

router = APIRouter(prefix="/users", tags=["users"])

_STAFF_ROLES = {UserRole.admin, UserRole.moderator, UserRole.manager, UserRole.support}


def _mask_phone(phone: str) -> str:
    """Return a partially masked phone number, e.g. +9929*******56."""
    if len(phone) <= 7:
        return phone
    return phone[:5] + "*" * (len(phone) - 7) + phone[-2:]


# ---------------------------------------------------------------------------
# /me routes — MUST be registered before /{user_id} wildcard routes
# ---------------------------------------------------------------------------

@router.get("/me/listings", response_model=ApiResponse[ListingListResponse])
def my_listings(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=50),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all listings belonging to the current user across all statuses."""
    query = (
        db.query(Listing)
        .options(joinedload(Listing.images))
        .filter(Listing.user_id == current_user.id, Listing.is_deleted == False)
    )
    if status_filter and status_filter != "all":
        try:
            status_enum = ListingStatus(status_filter)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status value: {status_filter}")
        query = query.filter(Listing.status == status_enum)

    total = query.count()
    pages = math.ceil(total / limit) if total > 0 else 1
    items = (
        query.order_by(Listing.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return ApiResponse(
        success=True,
        data=ListingListResponse(
            items=[ListingResponse.model_validate(i) for i in items],
            total=total,
            page=page,
            pages=pages,
        ),
        message="Your listings fetched",
    )


@router.get("/me/favorites", response_model=ApiResponse[ListingListResponse])
def get_my_favorites(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return paginated list of listings the current user has favorited."""
    query = (
        db.query(Listing)
        .options(joinedload(Listing.images))
        .join(Favorite, Favorite.listing_id == Listing.id)
        .filter(
            Favorite.user_id == current_user.id,
            Listing.is_deleted == False,
        )
        .order_by(Favorite.created_at.desc())
    )
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
            items=[ListingResponse.model_validate(i) for i in items],
            total=total,
            page=page,
            pages=pages,
        ),
        message="Favorites fetched",
    )


# ---------------------------------------------------------------------------
# /{user_id} wildcard routes — AFTER /me/* to avoid shadowing
# ---------------------------------------------------------------------------

@router.get("/{user_id}/profile", response_model=ApiResponse[dict])
def get_user_profile(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Public user profile.
    Phone number is included only when the caller is authenticated.
    """
    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    listing_count = (
        db.query(Listing)
        .filter(
            Listing.user_id == user_id,
            Listing.status == ListingStatus.active,
            Listing.is_deleted == False,
        )
        .count()
    )

    data = {
        "id": str(user.id),
        "name": user.name,
        "role": user.role,
        "avatar_url": user.avatar_url,
        "created_at": user.created_at,
        "listing_count": listing_count,
        # Phone is PII — expose in full only to the owner or staff; mask for other authenticated users
        "phone": (
            user.phone
            if current_user is not None and (
                str(current_user.id) == str(user.id)
                or current_user.role in _STAFF_ROLES
            )
            else _mask_phone(user.phone)
            if current_user is not None
            else None
        ),
    }
    return ApiResponse(success=True, data=data, message="User profile fetched")


@router.get("/{user_id}/listings", response_model=ApiResponse[ListingListResponse])
def get_user_listings(
    user_id: str,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """All active listings posted by a given user, paginated."""
    query = (
        db.query(Listing)
        .options(joinedload(Listing.images))
        .filter(
            Listing.user_id == user_id,
            Listing.status == ListingStatus.active,
            Listing.is_deleted == False,
        )
    )
    total = query.count()
    pages = math.ceil(total / limit) if total > 0 else 1
    items = (
        query.order_by(Listing.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return ApiResponse(
        success=True,
        data=ListingListResponse(
            items=[ListingResponse.model_validate(i) for i in items],
            total=total,
            page=page,
            pages=pages,
        ),
        message="User listings fetched",
    )
