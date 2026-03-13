import math
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import get_db
from app.models import Dealer, Listing, ListingStatus, User, UserRole
from app.schemas import (
    AdminStats,
    ApiResponse,
    DealerResponse,
    ListingListResponse,
    ListingResponse,
    UserResponse,
    UserUpdateRole,
)

router = APIRouter(prefix="/admin", tags=["admin"])

# ---------------------------------------------------------------------------
# Access dependencies
# ---------------------------------------------------------------------------

_ADMIN_ROLES = {UserRole.admin, UserRole.moderator, UserRole.manager}


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in _ADMIN_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super admin access required")
    return current_user


def require_moderator(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in {UserRole.admin, UserRole.moderator}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Moderator access required")
    return current_user


# ---------------------------------------------------------------------------
# Schemas (local, only needed here)
# ---------------------------------------------------------------------------

class BanPayload(BaseModel):
    reason: Optional[str] = None


class RejectPayload(BaseModel):
    reason: str


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

@router.get("/stats", response_model=ApiResponse[AdminStats])
def admin_stats(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    total_users = db.query(User).count()
    total_listings = db.query(Listing).count()
    active_listings = db.query(Listing).filter(Listing.status == ListingStatus.active).count()
    total_dealers = db.query(Dealer).count()
    pending_listings = db.query(Listing).filter(Listing.status == ListingStatus.pending).count()

    return ApiResponse(
        success=True,
        data=AdminStats(
            total_users=total_users,
            total_listings=total_listings,
            active_listings=active_listings,
            total_dealers=total_dealers,
            pending_listings=pending_listings,
        ),
        message="Stats fetched",
    )


# ---------------------------------------------------------------------------
# User management
# ---------------------------------------------------------------------------

@router.get("/users", response_model=ApiResponse[dict])
def list_users(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    role: Optional[UserRole] = None,
    search: Optional[str] = None,
    is_banned: Optional[bool] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = db.query(User)
    if role is not None:
        query = query.filter(User.role == role)
    if search:
        query = query.filter(User.phone.ilike(f"%{search}%") | User.name.ilike(f"%{search}%"))
    if is_banned is not None:
        query = query.filter(User.is_banned == is_banned)

    total = query.count()
    pages = math.ceil(total / limit) if total > 0 else 1
    users = query.order_by(User.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    return ApiResponse(
        success=True,
        data={"items": [UserResponse.model_validate(u) for u in users], "total": total, "page": page, "pages": pages},
        message="Users fetched",
    )


@router.get("/users/{user_id}", response_model=ApiResponse[dict])
def get_user_detail(user_id: str, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    listing_counts = {
        "active": db.query(Listing).filter(Listing.user_id == user_id, Listing.status == ListingStatus.active).count(),
        "pending": db.query(Listing).filter(Listing.user_id == user_id, Listing.status == ListingStatus.pending).count(),
        "rejected": db.query(Listing).filter(Listing.user_id == user_id, Listing.status == ListingStatus.rejected).count(),
    }
    dealer = db.query(Dealer).filter(Dealer.user_id == user_id).first()

    return ApiResponse(
        success=True,
        data={
            "user": UserResponse.model_validate(user).model_dump(),
            "listing_counts": listing_counts,
            "dealer": DealerResponse.model_validate(dealer).model_dump() if dealer else None,
        },
        message="User detail fetched",
    )


@router.put("/users/{user_id}/role", response_model=ApiResponse[UserResponse])
def update_user_role(
    user_id: str,
    payload: UserUpdateRole,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    if str(current_user.id) == user_id:
        raise HTTPException(status_code=400, detail="You cannot change your own role")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = payload.role
    db.commit()
    db.refresh(user)
    return ApiResponse(success=True, data=UserResponse.model_validate(user), message="Role updated")


@router.put("/users/{user_id}/ban", response_model=ApiResponse[UserResponse])
def ban_user(
    user_id: str,
    payload: BanPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if str(current_user.id) == user_id:
        raise HTTPException(status_code=400, detail="You cannot ban yourself")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_banned = True
    user.ban_reason = payload.reason
    db.commit()
    db.refresh(user)
    return ApiResponse(success=True, data=UserResponse.model_validate(user), message="User banned")


@router.put("/users/{user_id}/unban", response_model=ApiResponse[UserResponse])
def unban_user(user_id: str, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_banned = False
    user.ban_reason = None
    db.commit()
    db.refresh(user)
    return ApiResponse(success=True, data=UserResponse.model_validate(user), message="User unbanned")


@router.delete("/users/{user_id}", response_model=ApiResponse[None])
def delete_user(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_super_admin)):
    if str(current_user.id) == user_id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return ApiResponse(success=True, data=None, message="User deleted")


# ---------------------------------------------------------------------------
# Listing management
# ---------------------------------------------------------------------------

@router.get("/listings", response_model=ApiResponse[ListingListResponse])
def admin_listings(
    listing_status: Optional[ListingStatus] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = db.query(Listing).options(joinedload(Listing.images))
    if listing_status is not None:
        query = query.filter(Listing.status == listing_status)
    if search:
        query = query.filter(
            Listing.brand.ilike(f"%{search}%") | Listing.model.ilike(f"%{search}%") | Listing.city.ilike(f"%{search}%")
        )

    total = query.count()
    pages = math.ceil(total / limit) if total > 0 else 1
    items = query.order_by(Listing.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    return ApiResponse(
        success=True,
        data=ListingListResponse(
            items=[ListingResponse.model_validate(i) for i in items],
            total=total, page=page, pages=pages,
        ),
        message="Listings fetched",
    )


@router.put("/listings/{listing_id}/activate", response_model=ApiResponse[ListingResponse])
def activate_listing(listing_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    listing = db.query(Listing).options(joinedload(Listing.images)).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    listing.is_active = True
    listing.status = ListingStatus.active
    listing.moderated_by = current_user.id
    listing.rejection_reason = None
    db.commit()
    db.refresh(listing)
    return ApiResponse(success=True, data=ListingResponse.model_validate(listing), message="Listing activated")


@router.put("/listings/{listing_id}/deactivate", response_model=ApiResponse[ListingResponse])
def deactivate_listing(listing_id: str, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    listing = db.query(Listing).options(joinedload(Listing.images)).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    listing.is_active = False
    listing.status = ListingStatus.rejected
    db.commit()
    db.refresh(listing)
    return ApiResponse(success=True, data=ListingResponse.model_validate(listing), message="Listing deactivated")


# ---------------------------------------------------------------------------
# Moderation queue — approve / reject
# ---------------------------------------------------------------------------

@router.get("/moderation/pending", response_model=ApiResponse[ListingListResponse])
def pending_listings(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_moderator),
):
    """All listings awaiting review, ordered oldest-first (FIFO queue)."""
    query = (
        db.query(Listing)
        .options(joinedload(Listing.images))
        .filter(Listing.status == ListingStatus.pending)
    )
    total = query.count()
    pages = math.ceil(total / limit) if total > 0 else 1
    items = query.order_by(Listing.created_at.asc()).offset((page - 1) * limit).limit(limit).all()

    return ApiResponse(
        success=True,
        data=ListingListResponse(items=[ListingResponse.model_validate(i) for i in items], total=total, page=page, pages=pages),
        message="Pending listings fetched",
    )


@router.put("/moderation/{listing_id}/approve", response_model=ApiResponse[ListingResponse])
def approve_listing(listing_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_moderator)):
    listing = db.query(Listing).options(joinedload(Listing.images)).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    listing.status = ListingStatus.active
    listing.is_active = True
    listing.rejection_reason = None
    listing.moderated_by = current_user.id
    db.commit()
    db.refresh(listing)
    return ApiResponse(success=True, data=ListingResponse.model_validate(listing), message="Listing approved")


@router.put("/moderation/{listing_id}/reject", response_model=ApiResponse[ListingResponse])
def reject_listing(
    listing_id: str,
    payload: RejectPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_moderator),
):
    listing = db.query(Listing).options(joinedload(Listing.images)).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    listing.status = ListingStatus.rejected
    listing.is_active = False
    listing.rejection_reason = payload.reason
    listing.moderated_by = current_user.id
    db.commit()
    db.refresh(listing)
    return ApiResponse(success=True, data=ListingResponse.model_validate(listing), message="Listing rejected")


# ---------------------------------------------------------------------------
# Dealer management
# ---------------------------------------------------------------------------

@router.get("/dealers", response_model=ApiResponse[dict])
def admin_dealers(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    verified: Optional[bool] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = db.query(Dealer)
    if verified is not None:
        query = query.filter(Dealer.verified == verified)

    total = query.count()
    pages = math.ceil(total / limit) if total > 0 else 1
    dealers = query.order_by(Dealer.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    return ApiResponse(
        success=True,
        data={"items": [DealerResponse.model_validate(d) for d in dealers], "total": total, "page": page, "pages": pages},
        message="Dealers fetched",
    )


@router.put("/dealers/{dealer_id}/verify", response_model=ApiResponse[DealerResponse])
def verify_dealer(dealer_id: str, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    dealer = db.query(Dealer).filter(Dealer.id == dealer_id).first()
    if not dealer:
        raise HTTPException(status_code=404, detail="Dealer not found")
    dealer.verified = True
    db.commit()
    db.refresh(dealer)
    return ApiResponse(success=True, data=DealerResponse.model_validate(dealer), message="Dealer verified")


@router.put("/dealers/{dealer_id}/unverify", response_model=ApiResponse[DealerResponse])
def unverify_dealer(dealer_id: str, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    dealer = db.query(Dealer).filter(Dealer.id == dealer_id).first()
    if not dealer:
        raise HTTPException(status_code=404, detail="Dealer not found")
    dealer.verified = False
    db.commit()
    db.refresh(dealer)
    return ApiResponse(success=True, data=DealerResponse.model_validate(dealer), message="Dealer unverified")
