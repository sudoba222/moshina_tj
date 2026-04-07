import math
import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from pydantic import BaseModel, ConfigDict, EmailStr, field_validator
from sqlalchemy import cast
from sqlalchemy.dialects.postgresql import DATE as SADate
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.sql import func, or_

from app.auth import get_current_user
from app.database import get_db
from app.models import AuditLog, Currency, Dealer, FuelType, Listing, ListingLog, ListingStatus, TransmissionType, User, UserRole, log_audit
from app.services.telegram_notifier import send_telegram_notification
from app.email_service import send_listing_approved, send_listing_rejected, send_account_banned, send_dealer_verified
from app.schemas import (
    AdminStats,
    ApiResponse,
    DealerResponse,
    GrowthPoint,
    ImageResponse,
    ListingListResponse,
    ListingResponse,
    UserPublicResponse,
    UserResponse,
    UserResponseAdmin,
    UserUpdateRole,
)

router = APIRouter(prefix="/admin", tags=["admin"])
limiter = Limiter(key_func=get_remote_address)

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
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


def require_moderator(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in {UserRole.admin, UserRole.moderator}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Moderator access required")
    return current_user


def require_manager_or_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in {UserRole.admin, UserRole.manager}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager or admin access required")
    return current_user


def require_support_or_above(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in {UserRole.admin, UserRole.manager, UserRole.support}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Support access required")
    return current_user


# ---------------------------------------------------------------------------
# Schemas (local, only needed here)
# ---------------------------------------------------------------------------

class BanPayload(BaseModel):
    reason: Optional[str] = None

    @field_validator("reason")
    @classmethod
    def reason_max_length(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 500:
            raise ValueError("Ban reason must be at most 500 characters")
        return v


class RejectPayload(BaseModel):
    reason: str

    @field_validator("reason")
    @classmethod
    def reason_not_empty_and_max_length(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Rejection reason cannot be empty")
        if len(v) > 2000:
            raise ValueError("Rejection reason must be at most 2000 characters")
        return v


class SkipPayload(BaseModel):
    reason: Optional[str] = None


class BulkApprovePayload(BaseModel):
    listing_ids: list[str]

    @field_validator("listing_ids")
    @classmethod
    def listing_ids_max(cls, v: list[str]) -> list[str]:
        if len(v) > 100:
            raise ValueError("Cannot bulk-process more than 100 listings at once")
        return v


class BulkRejectPayload(BaseModel):
    listing_ids: list[str]
    reason: str

    @field_validator("listing_ids")
    @classmethod
    def listing_ids_max(cls, v: list[str]) -> list[str]:
        if len(v) > 100:
            raise ValueError("Cannot bulk-process more than 100 listings at once")
        return v


class NotePayload(BaseModel):
    note: str


class CreateUserPayload(BaseModel):
    phone: str
    name: Optional[str] = None
    password: str
    role: UserRole = UserRole.user

    @field_validator("phone")
    @classmethod
    def phone_must_be_valid(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith("+"):
            raise ValueError("Phone number must start with '+'")
        if len(v) < 7 or len(v) > 20:
            raise ValueError("Phone number must be between 7 and 20 characters")
        return v

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v) > 128:
            raise ValueError("Password must be at most 128 characters")
        return v


class EditUserPayload(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

    @field_validator("name")
    @classmethod
    def name_max_length(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if len(v) > 100:
                raise ValueError("Name must be at most 100 characters")
        return v or None

    @field_validator("phone")
    @classmethod
    def phone_must_be_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v.startswith("+"):
                raise ValueError("Phone number must start with '+'")
            if len(v) < 7 or len(v) > 20:
                raise ValueError("Phone number must be between 7 and 20 characters")
        return v


class AdminEditListingPayload(BaseModel):
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    price: Optional[float] = None
    currency: Optional[Currency] = None
    city: Optional[str] = None
    mileage: Optional[int] = None
    fuel: Optional[FuelType] = None
    transmission: Optional[TransmissionType] = None
    color: Optional[str] = None
    description: Optional[str] = None
    installment_available: Optional[bool] = None
    status: Optional[ListingStatus] = None


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

@router.get("/stats", response_model=ApiResponse[AdminStats])
def admin_stats(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    today = date.today()

    total_users = db.query(User).filter(User.is_deleted == False).count()
    new_users_today = db.query(User).filter(
        User.is_deleted == False,
        cast(User.created_at, SADate) == today,
    ).count()

    total_listings = db.query(Listing).filter(Listing.is_deleted == False).count()
    active_listings = db.query(Listing).filter(Listing.status == ListingStatus.active, Listing.is_deleted == False).count()
    pending_listings = db.query(Listing).filter(Listing.status == ListingStatus.pending, Listing.is_deleted == False).count()
    rejected_listings = db.query(Listing).filter(Listing.status == ListingStatus.rejected, Listing.is_deleted == False).count()

    total_dealers = db.query(Dealer).count()
    verified_dealers = db.query(Dealer).filter(Dealer.verified == True).count()

    # Growth series — last 30 days (one row per day, missing days fill to 0)
    thirty_days_ago = today - timedelta(days=29)

    user_rows = (
        db.query(cast(User.created_at, SADate).label("day"), func.count().label("cnt"))
        .filter(User.is_deleted == False, cast(User.created_at, SADate) >= thirty_days_ago)
        .group_by(cast(User.created_at, SADate))
        .all()
    )
    listing_rows = (
        db.query(cast(Listing.created_at, SADate).label("day"), func.count().label("cnt"))
        .filter(cast(Listing.created_at, SADate) >= thirty_days_ago)
        .group_by(cast(Listing.created_at, SADate))
        .all()
    )

    def _fill_series(rows, start: date, end: date) -> list:
        lookup = {str(r.day): r.cnt for r in rows}
        result = []
        current = start
        while current <= end:
            result.append({"date": str(current), "count": lookup.get(str(current), 0)})
            current += timedelta(days=1)
        return result

    user_growth = [GrowthPoint(**p) for p in _fill_series(user_rows, thirty_days_ago, today)]
    listing_growth = [GrowthPoint(**p) for p in _fill_series(listing_rows, thirty_days_ago, today)]

    return ApiResponse(
        success=True,
        data=AdminStats(
            total_users=total_users,
            new_users_today=new_users_today,
            total_listings=total_listings,
            active_listings=active_listings,
            pending_listings=pending_listings,
            rejected_listings=rejected_listings,
            total_dealers=total_dealers,
            verified_dealers=verified_dealers,
            user_growth=user_growth,
            listing_growth=listing_growth,
        ),
        message="Stats fetched",
    )


# ---------------------------------------------------------------------------
# User management
# ---------------------------------------------------------------------------

@router.get("/users", response_model=ApiResponse[dict])
@limiter.limit("30/minute")
def list_users(
    request: Request,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=50),
    role: Optional[UserRole] = None,
    search: Optional[str] = None,
    is_banned: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    query = db.query(User).filter(User.is_deleted == False)
    if role is not None:
        query = query.filter(User.role == role)
    if search:
        import uuid as _uuid
        stripped = search.strip()
        # UUID → search by exact user ID
        try:
            uid_val = _uuid.UUID(stripped)
            query = query.filter(User.id == uid_val)
        except ValueError:
            # Numeric → search by user_number
            try:
                num = int(stripped)
                query = query.filter(User.user_number == num)
            except ValueError:
                query = query.filter(
                    User.phone.ilike(f"%{stripped}%") | User.name.ilike(f"%{stripped}%") | User.email.ilike(f"%{stripped}%")
                )
    if is_banned is not None:
        query = query.filter(User.is_banned == is_banned)

    total = query.count()
    pages = math.ceil(total / limit) if total > 0 else 1
    users = query.order_by(User.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    # Both admin and moderator roles see full PII (phone, email, ban details);
    # other staff roles (manager, support) receive the public profile only.
    if current_user.role in {UserRole.admin, UserRole.moderator}:
        serialized = [UserResponseAdmin.model_validate(u) for u in users]
    else:
        serialized = [UserPublicResponse.model_validate(u) for u in users]

    return ApiResponse(
        success=True,
        data={"items": serialized, "total": total, "page": page, "pages": pages},
        message="Users fetched",
    )


@router.get("/users/{user_id}", response_model=ApiResponse[dict])
def get_user_detail(user_id: str, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Single GROUP BY query instead of 4 separate COUNT queries
    _status_rows = (
        db.query(Listing.status, func.count(Listing.id).label("cnt"))
        .filter(Listing.user_id == user_id)
        .group_by(Listing.status)
        .all()
    )
    _status_map = {row.status: row.cnt for row in _status_rows}
    listing_counts = {
        "active": _status_map.get(ListingStatus.active, 0),
        "pending": _status_map.get(ListingStatus.pending, 0),
        "rejected": _status_map.get(ListingStatus.rejected, 0),
        "total": sum(_status_map.values()),
    }

    # Last 10 listings for CRM preview
    recent_listings = (
        db.query(Listing)
        .options(joinedload(Listing.images), joinedload(Listing.user))
        .filter(Listing.user_id == user_id)
        .order_by(Listing.created_at.desc())
        .limit(10)
        .all()
    )

    dealer = db.query(Dealer).filter(Dealer.user_id == user_id).first()

    return ApiResponse(
        success=True,
        data={
            "user": UserResponse.model_validate(user).model_dump(),
            "listing_counts": listing_counts,
            "recent_listings": [ListingResponse.model_validate(l).model_dump() for l in recent_listings],
            "dealer": DealerResponse.model_validate(dealer).model_dump() if dealer else None,
            # ban_history: ban state is stored per-user (no history table); current ban info below
            "ban_info": {
                "is_banned": user.is_banned,
                "ban_reason": user.ban_reason,
            },
        },
        message="User detail fetched",
    )


@router.get("/users/{user_id}/login-history", response_model=ApiResponse[dict])
def get_user_login_history(
    user_id: str,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Paginated login history for a single user. Uses AuditLog action='login'."""
    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    query = (
        db.query(AuditLog)
        .filter(AuditLog.target_id == user_id, AuditLog.action == "login")
        .order_by(AuditLog.created_at.desc())
    )
    total = query.count()
    pages = math.ceil(total / limit) if total > 0 else 1
    logs = query.offset((page - 1) * limit).limit(limit).all()

    return ApiResponse(
        success=True,
        data={
            "items": [
                {
                    "id": str(log.id),
                    "method": log.details.get("method") if log.details else None,
                    "ip": log.details.get("ip") if log.details else None,
                    "created_at": log.created_at.isoformat(),
                }
                for log in logs
            ],
            "total": total,
            "page": page,
            "pages": pages,
        },
        message="Login history fetched",
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
    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    old_role = user.role
    user.role = payload.role
    log_audit(db, current_user.id, "change_role", "user", user.id, {"old_role": old_role.value, "new_role": payload.role.value})
    db.commit()
    db.refresh(user)
    return ApiResponse(success=True, data=UserResponse.model_validate(user), message="Role updated")


@router.put("/users/{user_id}/ban", response_model=ApiResponse[UserResponse])
def ban_user(
    user_id: str,
    payload: BanPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if str(current_user.id) == user_id:
        raise HTTPException(status_code=400, detail="You cannot ban yourself")
    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    _STAFF_ROLES = {UserRole.admin, UserRole.moderator, UserRole.manager, UserRole.support}
    if user.role in _STAFF_ROLES and current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot ban staff accounts")
    user.is_banned = True
    user.ban_reason = payload.reason
    log_audit(db, current_user.id, "ban_user", "user", user.id, {"reason": payload.reason})
    db.commit()
    db.refresh(user)
    if user.email:
        background_tasks.add_task(send_account_banned, user.email, payload.reason)
    if user.telegram_chat_id:
        background_tasks.add_task(
            send_telegram_notification,
            user.id,
            "account_banned",
            {"reason": payload.reason or ""},
        )
    return ApiResponse(success=True, data=UserResponse.model_validate(user), message="User banned")


@router.put("/users/{user_id}/unban", response_model=ApiResponse[UserResponse])
def unban_user(
    user_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_banned = False
    user.ban_reason = None
    log_audit(db, current_user.id, "unban_user", "user", user.id)
    db.commit()
    db.refresh(user)
    if user.telegram_chat_id:
        background_tasks.add_task(
            send_telegram_notification,
            user.id,
            "account_unbanned",
            {},
        )
    return ApiResponse(success=True, data=UserResponse.model_validate(user), message="User unbanned")


@router.delete("/users/{user_id}", response_model=ApiResponse[None])
def delete_user(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_super_admin)):
    from datetime import datetime, timezone
    if str(current_user.id) == user_id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_deleted = True
    user.deleted_at = datetime.now(timezone.utc)
    # Anonymize unique fields so the same email/phone/google_id can be re-registered.
    # The DB has UNIQUE constraints on these columns; soft-delete alone doesn't free them.
    uid = str(user.id)
    user.email = f"deleted_{uid}@deleted" if user.email else None
    user.phone = f"deleted_{uid}"
    user.google_id = None
    user.apple_id = None
    user.telegram_chat_id = None
    log_audit(db, current_user.id, "delete_user", "user", user.id, {"name": user.name, "phone": user.phone})
    db.commit()
    return ApiResponse(success=True, data=None, message="User deleted")


@router.post("/users", response_model=ApiResponse[UserResponse])
def create_user(
    payload: CreateUserPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    from app.auth import hash_password
    existing = db.query(User).filter(User.phone == payload.phone, User.is_deleted == False).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this phone already exists")
    user = User(
        phone=payload.phone,
        name=payload.name,
        password_hash=hash_password(payload.password),
        role=payload.role,
        phone_verified=True,
    )
    db.add(user)
    log_audit(db, current_user.id, "create_user", "user", user.id, {"phone": payload.phone, "role": payload.role.value})
    db.commit()
    db.refresh(user)
    return ApiResponse(success=True, data=UserResponse.model_validate(user), message="User created")


@router.put("/users/{user_id}", response_model=ApiResponse[UserResponse])
def edit_user(
    user_id: str,
    payload: EditUserPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.name is not None:
        user.name = payload.name
    if payload.phone is not None:
        conflict = db.query(User).filter(User.phone == payload.phone, User.id != user_id, User.is_deleted == False).first()
        if conflict:
            raise HTTPException(status_code=400, detail="Phone already in use")
        user.phone = payload.phone
    if payload.email is not None:
        user.email = payload.email
    log_audit(db, current_user.id, "edit_user", "user", user.id, {"changes": payload.model_dump(exclude_none=True)})
    db.commit()
    db.refresh(user)
    return ApiResponse(success=True, data=UserResponse.model_validate(user), message="User updated")


# ---------------------------------------------------------------------------
# Listing management
# ---------------------------------------------------------------------------

def _require_staff(current_user: User = Depends(get_current_user)) -> User:
    """Allow admin, moderator, manager, and support roles to access staff-level listing endpoints."""
    allowed = {UserRole.admin, UserRole.moderator, UserRole.manager, UserRole.support}
    if current_user.role not in allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Staff access required")
    return current_user


# ---------------------------------------------------------------------------
# Admin listing schemas
# ---------------------------------------------------------------------------

class AdminListingUserInfo(BaseModel):
    id: uuid.UUID
    name: Optional[str] = None
    phone: str
    email: Optional[str] = None
    created_at: Optional[datetime] = None


class AdminListingLastLog(BaseModel):
    action: str
    actor_name: Optional[str] = None
    reason: Optional[str] = None
    created_at: datetime


class AdminListingItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    brand: str
    model: str
    year: int
    price: Decimal
    currency: str
    city: str
    status: ListingStatus
    is_active: bool
    views: int
    created_at: datetime
    updated_at: datetime
    user: Optional[AdminListingUserInfo] = None
    primary_image_url: Optional[str] = None
    last_log: Optional[AdminListingLastLog] = None


class AdminListingLogEntry(BaseModel):
    id: uuid.UUID
    action: str
    actor_id: Optional[uuid.UUID] = None
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None
    from_status: Optional[str] = None
    to_status: Optional[str] = None
    reason: Optional[str] = None
    created_at: datetime


class AdminListingDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    type: str
    brand: str
    model: str
    year: int
    price: Decimal
    currency: str
    mileage: Optional[int] = None
    fuel: Optional[str] = None
    transmission: Optional[str] = None
    color: Optional[str] = None
    city: str
    description: Optional[str] = None
    installment_available: bool
    is_dealer_listing: bool
    is_active: bool
    status: ListingStatus
    rejection_reason: Optional[str] = None
    moderator_note: Optional[str] = None
    views: int
    created_at: datetime
    updated_at: datetime
    images: list[ImageResponse] = []
    user: Optional[AdminListingUserInfo] = None
    logs: list[AdminListingLogEntry] = []


@router.get("/listings", response_model=ApiResponse[dict])
def admin_listings(
    status: Optional[str] = Query(default=None, description="all | active | pending | rejected"),
    search: Optional[str] = None,
    user_id: Optional[str] = None,
    brand: Optional[str] = None,
    city: Optional[str] = None,
    include_deleted: bool = Query(default=False, description="Include soft-deleted listings"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(_require_staff),
):
    import uuid as _uuid
    query = (
        db.query(Listing)
        .options(joinedload(Listing.images), joinedload(Listing.user))
    )

    if not include_deleted:
        query = query.filter(Listing.is_deleted == False)

    if status and status != "all":
        try:
            status_enum = ListingStatus(status)
            query = query.filter(Listing.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status value: {status}")

    if search:
        import uuid as _uuid
        stripped_search = search.strip()
        # UUID → search by exact listing ID
        try:
            lid_val = _uuid.UUID(stripped_search)
            query = query.filter(Listing.id == lid_val)
        except ValueError:
            ilike_search = f"%{stripped_search}%"
            query = query.filter(
                or_(
                    Listing.brand.ilike(ilike_search),
                    Listing.model.ilike(ilike_search),
                    Listing.city.ilike(ilike_search),
                    Listing.description.ilike(ilike_search),
                )
            )
    if user_id:
        try:
            uid = _uuid.UUID(user_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid user_id UUID")
        query = query.filter(Listing.user_id == uid)
    if brand:
        query = query.filter(Listing.brand.ilike(f"%{brand}%"))
    if city:
        query = query.filter(Listing.city.ilike(f"%{city}%"))

    total = query.count()
    pages = math.ceil(total / limit) if total > 0 else 1
    items = query.order_by(Listing.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    # Fetch latest log for each listing in a single query to avoid N+1
    listing_ids = [item.id for item in items]
    last_logs: dict = {}
    if listing_ids:
        from sqlalchemy import select
        subq = (
            db.query(
                ListingLog.listing_id,
                func.max(ListingLog.created_at).label("max_created_at"),
            )
            .filter(ListingLog.listing_id.in_(listing_ids))
            .group_by(ListingLog.listing_id)
            .subquery()
        )
        log_rows = (
            db.query(ListingLog)
            .join(subq, (ListingLog.listing_id == subq.c.listing_id) & (ListingLog.created_at == subq.c.max_created_at))
            .options(joinedload(ListingLog.actor))
            .all()
        )
        for log in log_rows:
            last_logs[log.listing_id] = log

    result_items = []
    for item in items:
        primary_url = None
        for img in item.images:
            if img.is_primary:
                primary_url = img.url
                break
        if primary_url is None and item.images:
            primary_url = item.images[0].url

        last_log = last_logs.get(item.id)
        last_log_out = None
        if last_log:
            last_log_out = AdminListingLastLog(
                action=last_log.action,
                actor_name=last_log.actor.name if last_log.actor else None,
                reason=last_log.reason,
                created_at=last_log.created_at,
            )

        user_out = None
        if item.user:
            user_out = AdminListingUserInfo(
                id=item.user.id,
                name=item.user.name,
                phone=item.user.phone,
                email=item.user.email,
            )

        result_items.append(AdminListingItem(
            id=item.id,
            brand=item.brand,
            model=item.model,
            year=item.year,
            price=item.price,
            currency=item.currency.value,
            city=item.city,
            status=item.status,
            is_active=item.is_active,
            views=item.views,
            created_at=item.created_at,
            updated_at=item.updated_at,
            user=user_out,
            primary_image_url=primary_url,
            last_log=last_log_out,
        ))

    return ApiResponse(
        success=True,
        data={"items": [i.model_dump() for i in result_items], "total": total, "page": page, "pages": pages},
        message="Listings fetched",
    )


@router.get("/listings/{listing_id}", response_model=ApiResponse[AdminListingDetail])
def admin_listing_detail(
    listing_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(_require_staff),
):
    """Return full listing detail for staff — bypasses active/pending filters."""
    listing = (
        db.query(Listing)
        .options(
            joinedload(Listing.images),
            joinedload(Listing.user),
            joinedload(Listing.logs).joinedload(ListingLog.actor),
        )
        .filter(Listing.id == listing_id)
        .first()
    )
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    user_out = None
    if listing.user:
        user_out = AdminListingUserInfo(
            id=listing.user.id,
            name=listing.user.name,
            phone=listing.user.phone,
            email=listing.user.email,
            created_at=listing.user.created_at,
        )

    logs_out = [
        AdminListingLogEntry(
            id=log.id,
            action=log.action,
            actor_id=log.actor.id if log.actor else None,
            actor_name=log.actor.name if log.actor else None,
            actor_role=log.actor.role.value if log.actor else None,
            from_status=log.from_status,
            to_status=log.to_status,
            reason=log.reason,
            created_at=log.created_at,
        )
        for log in listing.logs
    ]

    detail = AdminListingDetail(
        id=listing.id,
        user_id=listing.user_id,
        type=listing.type.value,
        brand=listing.brand,
        model=listing.model,
        year=listing.year,
        price=listing.price,
        currency=listing.currency.value,
        mileage=listing.mileage,
        fuel=listing.fuel.value if listing.fuel else None,
        transmission=listing.transmission.value if listing.transmission else None,
        color=listing.color,
        city=listing.city,
        description=listing.description,
        installment_available=listing.installment_available,
        is_dealer_listing=listing.is_dealer_listing,
        is_active=listing.is_active,
        status=listing.status,
        rejection_reason=listing.rejection_reason,
        moderator_note=listing.moderator_note,
        views=listing.views,
        created_at=listing.created_at,
        updated_at=listing.updated_at,
        images=[ImageResponse.model_validate(img) for img in listing.images],
        user=user_out,
        logs=logs_out,
    )
    return ApiResponse(success=True, data=detail, message="Listing fetched")


@router.get("/staff/search", response_model=ApiResponse[dict])
def staff_search_listings(
    listing_id: Optional[str] = Query(default=None, description="Exact listing UUID"),
    user_phone: Optional[str] = Query(default=None, description="Partial phone match"),
    user_name: Optional[str] = Query(default=None, description="Partial name match"),
    status: Optional[str] = Query(default=None, description="pending|active|rejected|draft|all"),
    moderator_id: Optional[str] = Query(default=None, description="UUID of moderator who processed it"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(_require_staff),
):
    """Advanced staff search — includes ALL statuses (pending, active, rejected, draft)."""
    import uuid as _uuid

    query = (
        db.query(Listing)
        .options(joinedload(Listing.images), joinedload(Listing.user))
    )

    if listing_id:
        try:
            lid = _uuid.UUID(listing_id)
            query = query.filter(Listing.id == lid)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid listing_id UUID")

    if status and status != "all":
        try:
            status_enum = ListingStatus(status)
            query = query.filter(Listing.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    if moderator_id:
        try:
            mid = _uuid.UUID(moderator_id)
            query = query.filter(Listing.moderated_by == mid)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid moderator_id UUID")

    if user_phone or user_name:
        query = query.join(User, Listing.user_id == User.id)
        if user_phone:
            query = query.filter(User.phone.ilike(f"%{user_phone}%"))
        if user_name:
            query = query.filter(User.name.ilike(f"%{user_name}%"))

    total = query.count()
    pages = math.ceil(total / limit) if total > 0 else 1
    items = query.order_by(Listing.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    result_items = []
    for item in items:
        primary_url = next((img.url for img in item.images if img.is_primary), None)
        if primary_url is None and item.images:
            primary_url = item.images[0].url

        user_out = None
        if item.user:
            user_out = AdminListingUserInfo(
                id=item.user.id,
                name=item.user.name,
                phone=item.user.phone,
                email=item.user.email,
                created_at=item.user.created_at,
            )

        result_items.append(AdminListingItem(
            id=item.id,
            brand=item.brand,
            model=item.model,
            year=item.year,
            price=item.price,
            currency=item.currency.value,
            city=item.city,
            status=item.status,
            is_active=item.is_active,
            views=item.views,
            created_at=item.created_at,
            updated_at=item.updated_at,
            user=user_out,
            primary_image_url=primary_url,
            last_log=None,
        ))

    return ApiResponse(
        success=True,
        data={"items": [i.model_dump() for i in result_items], "total": total, "page": page, "pages": pages},
        message="Search results",
    )


@router.put("/listings/{listing_id}/activate", response_model=ApiResponse[ListingResponse])
def activate_listing(listing_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    listing = db.query(Listing).options(joinedload(Listing.images), joinedload(Listing.user)).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    old_status = listing.status.value if listing.status else None
    listing.is_active = True
    listing.status = ListingStatus.active
    listing.moderated_by = current_user.id
    listing.rejection_reason = None
    log_audit(db, current_user.id, "approve_listing", "listing", listing.id)
    db.add(ListingLog(
        listing_id=listing.id,
        actor_id=current_user.id,
        action="reactivated",
        from_status=old_status,
        to_status="active",
    ))
    db.commit()
    db.refresh(listing)
    return ApiResponse(success=True, data=ListingResponse.model_validate(listing), message="Listing activated")


@router.put("/listings/{listing_id}/deactivate", response_model=ApiResponse[ListingResponse])
def deactivate_listing(listing_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    listing = db.query(Listing).options(joinedload(Listing.images), joinedload(Listing.user)).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    old_status = listing.status.value if listing.status else None
    listing.is_active = False
    # Do NOT change the status — admin deactivation only hides the listing
    # (is_active=False) without altering the moderation status.
    log_audit(db, current_user.id, "deactivate_listing", "listing", listing.id)
    db.add(ListingLog(
        listing_id=listing.id,
        actor_id=current_user.id,
        action="deactivated",
        from_status=old_status,
        to_status=old_status,
    ))
    db.commit()
    db.refresh(listing)
    return ApiResponse(success=True, data=ListingResponse.model_validate(listing), message="Listing deactivated")


@router.put("/listings/{listing_id}", response_model=ApiResponse[ListingResponse])
def admin_edit_listing(
    listing_id: str,
    payload: AdminEditListingPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    listing = db.query(Listing).options(joinedload(Listing.images), joinedload(Listing.user)).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    fields = payload.model_dump(exclude_none=True)
    old_status = listing.status.value if listing.status else None
    new_status = old_status
    if "status" in fields:
        try:
            new_status_enum = ListingStatus(fields.pop("status"))
            listing.status = new_status_enum
            new_status = new_status_enum.value
            listing.is_active = new_status_enum == ListingStatus.active
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status")
    for key, val in fields.items():
        setattr(listing, key, val)
    log_audit(db, current_user.id, "edit_listing", "listing", listing.id, {"changes": fields})
    db.add(ListingLog(
        listing_id=listing.id,
        actor_id=current_user.id,
        action="staff_edit",
        from_status=old_status,
        to_status=new_status,
        reason=f"Staff edit: {', '.join(fields.keys()) if fields else 'status change'}",
    ))
    db.commit()
    db.refresh(listing)
    return ApiResponse(success=True, data=ListingResponse.model_validate(listing), message="Listing updated")


@router.delete("/listings/{listing_id}", response_model=ApiResponse[None])
def admin_delete_listing(
    listing_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    listing = db.query(Listing).filter(Listing.id == listing_id, Listing.is_deleted == False).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    log_audit(db, current_user.id, "delete_listing", "listing", listing.id, {"brand": listing.brand, "model": listing.model})
    prev_status = listing.status.value if listing.status else None
    listing.is_deleted = True
    listing.is_active = False
    listing.status = ListingStatus.rejected
    listing.locked_by = None
    listing.locked_at = None
    db.add(ListingLog(
        listing_id=listing.id,
        actor_id=current_user.id,
        action="admin_deleted",
        from_status=prev_status,
        to_status="deleted",
    ))
    db.commit()
    return ApiResponse(success=True, data=None, message="Listing deleted")


@router.get("/listings/{listing_id}/logs", response_model=ApiResponse[dict])
def get_listing_logs(
    listing_id: str,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Return the full status-change audit trail for a single listing."""
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    base_query = (
        db.query(ListingLog)
        .options(joinedload(ListingLog.actor))
        .filter(ListingLog.listing_id == listing_id)
    )
    total = base_query.count()
    pages = math.ceil(total / limit) if total > 0 else 1
    logs = (
        base_query
        .order_by(ListingLog.created_at.asc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    items = [
        {
            "id": str(log.id),
            "action": log.action,
            "from_status": log.from_status,
            "to_status": log.to_status,
            "reason": log.reason,
            "created_at": log.created_at.isoformat() if log.created_at else None,
            "actor": {
                "id": str(log.actor.id),
                "name": log.actor.name,
                "role": log.actor.role.value,
            } if log.actor else None,
        }
        for log in logs
    ]

    return ApiResponse(
        success=True,
        data={"items": items, "total": total, "page": page, "pages": pages},
        message="Logs fetched",
    )


# ---------------------------------------------------------------------------
# Moderation queue — approve / reject
# ---------------------------------------------------------------------------

_LOCK_EXPIRY_MINUTES = 15

@router.get("/moderation/pending", response_model=ApiResponse[ListingListResponse])
def pending_listings(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    claim: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_moderator),
):
    """All listings awaiting review, oldest-first. Excludes listings locked by other active moderators."""
    from datetime import datetime, timedelta, timezone
    from app.models import ModerationSession

    now = datetime.now(timezone.utc)
    lock_cutoff = now - timedelta(minutes=_LOCK_EXPIRY_MINUTES)

    active_session = db.query(ModerationSession).filter(
        ModerationSession.moderator_id == current_user.id,
        ModerationSession.is_active == True,
    ).first()

    query = (
        db.query(Listing)
        .options(joinedload(Listing.user), joinedload(Listing.images))
        .filter(
            Listing.status == ListingStatus.pending,
            Listing.is_deleted == False,
            or_(
                Listing.locked_by == None,
                Listing.locked_by == current_user.id,
                Listing.locked_at < lock_cutoff,
            ),
        )
    )

    if active_session:
        if active_session.filter_date_from:
            query = query.filter(Listing.created_at >= active_session.filter_date_from)
        if active_session.filter_date_to:
            query = query.filter(Listing.created_at <= active_session.filter_date_to)
        if active_session.filter_type:
            query = query.filter(Listing.type == active_session.filter_type)
        if active_session.filter_city:
            query = query.filter(Listing.city.ilike(f"%{active_session.filter_city}%"))
        if active_session.filter_brand:
            query = query.filter(Listing.brand.ilike(f"%{active_session.filter_brand}%"))

    total = query.count()
    pages = math.ceil(total / limit) if total > 0 else 1
    items = query.order_by(Listing.created_at.asc()).offset((page - 1) * limit).limit(limit).all()

    if claim and items:
        # Atomically claim the first listing using SELECT FOR UPDATE SKIP LOCKED
        # to prevent two moderators from simultaneously claiming the same item.
        first_id = items[0].id
        to_claim = (
            db.query(Listing)
            .with_for_update(skip_locked=True)
            .filter(
                Listing.id == first_id,
                or_(
                    Listing.locked_by == None,
                    Listing.locked_by == current_user.id,
                    Listing.locked_at < lock_cutoff,
                ),
            )
            .first()
        )
        if to_claim:
            to_claim.locked_by = current_user.id
            to_claim.locked_at = now
            db.commit()

    return ApiResponse(
        success=True,
        data=ListingListResponse(items=[ListingResponse.model_validate(i) for i in items], total=total, page=page, pages=pages),
        message="Pending listings fetched",
    )


@router.put("/moderation/{listing_id}/approve", response_model=ApiResponse[ListingResponse])
def approve_listing(
    listing_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_moderator),
):
    listing = db.query(Listing).options(joinedload(Listing.user), joinedload(Listing.images)).filter(Listing.id == listing_id, Listing.is_deleted == False).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.user_id == current_user.id:
        raise HTTPException(status_code=403, detail="Moderators cannot approve their own listings")
    if listing.status == ListingStatus.active:
        return ApiResponse(success=True, data=ListingResponse.model_validate(listing), message="Listing is already active")
    old_status = listing.status.value if listing.status else None
    listing.status = ListingStatus.active
    listing.is_active = True
    listing.rejection_reason = None
    listing.moderated_by = current_user.id
    listing.locked_by = None
    listing.locked_at = None
    # Update session stats
    from app.models import ModerationSession
    active_session = db.query(ModerationSession).filter(
        ModerationSession.moderator_id == current_user.id,
        ModerationSession.is_active == True
    ).first()
    if active_session:
        active_session.posts_approved += 1
    log_audit(db, current_user.id, "approve_listing", "listing", listing.id)
    db.add(ListingLog(
        listing_id=listing.id,
        actor_id=current_user.id,
        action="approved",
        from_status=old_status,
        to_status="active",
        reason=None,
    ))
    db.commit()
    db.refresh(listing)

    car_name = f"{listing.brand} {listing.model} {listing.year}"
    listing_url = f"https://tajcar.tj/car/{listing.id}"

    # Email notification
    if listing.user and listing.user.email:
        background_tasks.add_task(
            send_listing_approved,
            listing.user.email,
            car_name,
            listing_url,
        )

    # Telegram notification
    if listing.user and listing.user.telegram_chat_id:
        background_tasks.add_task(
            send_telegram_notification,
            listing.user_id,
            "listing_approved",
            {"car_name": car_name, "listing_id": str(listing.id)},
        )

    return ApiResponse(success=True, data=ListingResponse.model_validate(listing), message="Listing approved")


@router.put("/moderation/{listing_id}/reject", response_model=ApiResponse[ListingResponse])
def reject_listing(
    listing_id: str,
    payload: RejectPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_moderator),
):
    listing = db.query(Listing).options(joinedload(Listing.images), joinedload(Listing.user)).filter(Listing.id == listing_id, Listing.is_deleted == False).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.user_id == current_user.id:
        raise HTTPException(status_code=403, detail="Moderators cannot reject their own listings")
    if listing.status == ListingStatus.rejected:
        return ApiResponse(success=True, data=ListingResponse.model_validate(listing), message="Listing is already rejected")
    old_status = listing.status.value if listing.status else None
    listing.status = ListingStatus.rejected
    listing.is_active = False
    listing.rejection_reason = payload.reason
    listing.moderated_by = current_user.id
    listing.locked_by = None
    listing.locked_at = None
    # Update session stats
    from app.models import ModerationSession
    active_session = db.query(ModerationSession).filter(
        ModerationSession.moderator_id == current_user.id,
        ModerationSession.is_active == True
    ).first()
    if active_session:
        active_session.posts_rejected += 1
    log_audit(db, current_user.id, "reject_listing", "listing", listing.id, {"reason": payload.reason})
    db.add(ListingLog(
        listing_id=listing.id,
        actor_id=current_user.id,
        action="rejected",
        from_status=old_status,
        to_status="rejected",
        reason=payload.reason,
    ))
    db.commit()
    db.refresh(listing)

    car_name = f"{listing.brand} {listing.model} {listing.year}"
    edit_url = f"https://tajcar.tj/post?edit={listing.id}"

    # Email notification
    if listing.user and listing.user.email:
        background_tasks.add_task(
            send_listing_rejected,
            listing.user.email,
            car_name,
            payload.reason,
            edit_url,
        )

    # Telegram notification
    if listing.user and listing.user.telegram_chat_id:
        background_tasks.add_task(
            send_telegram_notification,
            listing.user_id,
            "listing_rejected",
            {"car_name": car_name, "listing_id": str(listing.id), "reason": payload.reason or ""},
        )

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
def verify_dealer(
    dealer_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    dealer = db.query(Dealer).options(joinedload(Dealer.user)).filter(Dealer.id == dealer_id).first()
    if not dealer:
        raise HTTPException(status_code=404, detail="Dealer not found")
    dealer.verified = True
    log_audit(db, current_user.id, "verify_dealer", "dealer", dealer.id)
    db.commit()
    db.refresh(dealer)
    profile_url = f"https://tajcar.tj/dealers/{dealer_id}"
    if dealer.user and dealer.user.email:
        background_tasks.add_task(
            send_dealer_verified,
            dealer.user.email,
            dealer.business_name,
            profile_url,
        )
    if dealer.user and dealer.user.telegram_chat_id:
        background_tasks.add_task(
            send_telegram_notification,
            dealer.user.id,
            "dealer_verified",
            {"business_name": dealer.business_name, "dealer_id": str(dealer.id)},
        )
    return ApiResponse(success=True, data=DealerResponse.model_validate(dealer), message="Dealer verified")


@router.put("/dealers/{dealer_id}/unverify", response_model=ApiResponse[DealerResponse])
def unverify_dealer(dealer_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    dealer = db.query(Dealer).filter(Dealer.id == dealer_id).first()
    if not dealer:
        raise HTTPException(status_code=404, detail="Dealer not found")
    dealer.verified = False
    log_audit(db, current_user.id, "unverify_dealer", "dealer", dealer.id)
    db.commit()
    db.refresh(dealer)
    return ApiResponse(success=True, data=DealerResponse.model_validate(dealer), message="Dealer unverified")


# ---------------------------------------------------------------------------
# Moderator inline edit — patch brand/model/description before approving
# ---------------------------------------------------------------------------

class ModeratorListingPatch(BaseModel):
    brand: Optional[str] = None
    model: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    currency: Optional[str] = None
    year: Optional[int] = None
    city: Optional[str] = None
    mileage: Optional[int] = None
    fuel: Optional[str] = None
    transmission: Optional[str] = None
    color: Optional[str] = None

    @field_validator("brand", "model", "city")
    @classmethod
    def strip_and_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Field cannot be empty")
            if len(v) > 100:
                raise ValueError("Field cannot exceed 100 characters")
        return v

    @field_validator("description")
    @classmethod
    def description_max(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 5000:
            raise ValueError("Description cannot exceed 5000 characters")
        return v

    @field_validator("price")
    @classmethod
    def price_positive(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v <= 0:
            raise ValueError("Price must be greater than zero")
        return v

@router.patch("/moderation/{listing_id}/edit", response_model=ApiResponse[ListingResponse])
def moderator_edit_listing(
    listing_id: str,
    payload: ModeratorListingPatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_moderator),
):
    """Allows a moderator to fix listing fields inline before approving."""
    listing = db.query(Listing).options(joinedload(Listing.images), joinedload(Listing.user)).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if payload.brand is not None:
        listing.brand = payload.brand.strip()
    if payload.model is not None:
        listing.model = payload.model.strip()
    if payload.description is not None:
        listing.description = payload.description.strip()
    if payload.price is not None:
        listing.price = payload.price
    if payload.year is not None:
        listing.year = payload.year
    if payload.city is not None:
        listing.city = payload.city.strip()
    if payload.mileage is not None:
        listing.mileage = payload.mileage
    if payload.fuel is not None:
        try:
            listing.fuel = FuelType(payload.fuel)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid fuel type: {payload.fuel}")
    if payload.transmission is not None:
        try:
            listing.transmission = TransmissionType(payload.transmission)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid transmission type: {payload.transmission}")
    if payload.currency is not None:
        try:
            listing.currency = Currency(payload.currency)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid currency: {payload.currency}")
    if payload.color is not None:
        listing.color = payload.color.strip()
    changed = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    log_audit(db, current_user.id, "moderator_edit_listing", "listing", listing.id, {"changes": changed})
    db.add(ListingLog(
        listing_id=listing.id,
        actor_id=current_user.id,
        action="staff_edit",
        from_status=listing.status.value if listing.status else None,
        to_status=listing.status.value if listing.status else None,
        reason=f"Moderator inline edit: {', '.join(changed.keys())}",
    ))
    db.commit()
    db.refresh(listing)
    return ApiResponse(success=True, data=ListingResponse.model_validate(listing), message="Listing updated")


# ---------------------------------------------------------------------------
# Moderation sessions
# ---------------------------------------------------------------------------

class SessionStartPayload(BaseModel):
    timer_minutes: Optional[int] = None   # 10, 20, 30, or None = unlimited
    filter_date_from: Optional[str] = None  # ISO date string
    filter_date_to: Optional[str] = None
    filter_type: Optional[str] = None     # "sale", "rent", or None
    filter_city: Optional[str] = None
    filter_brand: Optional[str] = None


@router.post("/moderation/session/start", response_model=ApiResponse[dict])
def start_session(
    payload: SessionStartPayload = SessionStartPayload(),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_moderator),
):
    """Start a new moderation session with optional filters. Ends any existing active session first."""
    from app.models import ModerationSession
    from datetime import datetime, timezone

    # Release locks held by this moderator
    db.query(Listing).filter(Listing.locked_by == current_user.id).update(
        {"locked_by": None, "locked_at": None}
    )

    # End any existing active session
    existing = db.query(ModerationSession).filter(
        ModerationSession.moderator_id == current_user.id,
        ModerationSession.is_active == True
    ).first()
    if existing:
        existing.is_active = False
        existing.ended_at = func.now()

    date_from = None
    date_to = None
    if payload.filter_date_from:
        try:
            date_from = datetime.fromisoformat(payload.filter_date_from.replace("Z", "+00:00"))
        except Exception:
            pass
    if payload.filter_date_to:
        try:
            date_to = datetime.fromisoformat(payload.filter_date_to.replace("Z", "+00:00"))
        except Exception:
            pass

    session = ModerationSession(
        moderator_id=current_user.id,
        timer_minutes=payload.timer_minutes,
        filter_date_from=date_from,
        filter_date_to=date_to,
        filter_type=payload.filter_type,
        filter_city=payload.filter_city,
        filter_brand=payload.filter_brand,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return ApiResponse(success=True, data={
        "id": str(session.id),
        "moderator_id": str(session.moderator_id),
        "started_at": session.started_at.isoformat(),
        "ended_at": None,
        "is_active": True,
        "approved_count": 0,
        "rejected_count": 0,
        "skipped_count": 0,
        "timer_minutes": session.timer_minutes,
        "limit": 0,
    }, message="Session started")


@router.post("/moderation/session/end", response_model=ApiResponse[dict])
def end_session(
    auto_ended: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_moderator),
):
    """End the current active moderation session."""
    from app.models import ModerationSession
    session = db.query(ModerationSession).filter(
        ModerationSession.moderator_id == current_user.id,
        ModerationSession.is_active == True
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="No active session")
    # Release any locks held by this moderator
    db.query(Listing).filter(Listing.locked_by == current_user.id).update(
        {"locked_by": None, "locked_at": None}
    )
    session.is_active = False
    session.ended_at = func.now()
    session.auto_ended = auto_ended
    db.commit()
    db.refresh(session)
    return ApiResponse(success=True, data={
        "id": str(session.id),
        "moderator_id": str(session.moderator_id),
        "started_at": session.started_at.isoformat(),
        "ended_at": session.ended_at.isoformat() if session.ended_at else None,
        "is_active": False,
        "approved_count": session.posts_approved,
        "rejected_count": session.posts_rejected,
        "skipped_count": session.posts_skipped,
        "timer_minutes": session.timer_minutes,
        "limit": 0,
    }, message="Session ended")


@router.get("/moderation/session/active", response_model=ApiResponse[dict])
def get_active_session(db: Session = Depends(get_db), current_user: User = Depends(require_moderator)):
    """Get the current moderator's active session, if any."""
    from app.models import ModerationSession
    session = db.query(ModerationSession).filter(
        ModerationSession.moderator_id == current_user.id,
        ModerationSession.is_active == True
    ).first()
    if not session:
        return ApiResponse(success=True, data=None, message="No active session")
    return ApiResponse(success=True, data={
        "id": str(session.id),
        "moderator_id": str(session.moderator_id),
        "started_at": session.started_at.isoformat(),
        "ended_at": None,
        "is_active": True,
        "approved_count": session.posts_approved,
        "rejected_count": session.posts_rejected,
        "skipped_count": session.posts_skipped,
        "timer_minutes": session.timer_minutes,
        "limit": 0,
    }, message="Active session found")


@router.post("/moderation/{listing_id}/skip", response_model=ApiResponse[dict])
def skip_listing(
    listing_id: str,
    payload: SkipPayload = SkipPayload(),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_moderator),
):
    """Skip a listing (release lock, increment skip counter) and track in session."""
    from app.models import ModerationSession
    listing = db.query(Listing).options(joinedload(Listing.images)).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    active_session = db.query(ModerationSession).filter(
        ModerationSession.moderator_id == current_user.id,
        ModerationSession.is_active == True
    ).first()
    listing.locked_by = None
    listing.locked_at = None
    if active_session:
        active_session.posts_skipped += 1
        if payload.reason:
            active_session.last_skip_reason = payload.reason
    db.commit()
    return ApiResponse(success=True, data={"listing_id": listing_id}, message="Listing skipped")


@router.get("/moderator-activity", response_model=ApiResponse[list])
def moderator_activity(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    """
    For admin/manager: shows each moderator's activity.
    Returns per-moderator stats: total sessions, posts moderated today, posts in last 30 min.
    """
    from app.models import ModerationSession
    from datetime import datetime, timedelta, timezone

    now = datetime.now(timezone.utc)
    thirty_min_ago = now - timedelta(minutes=30)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    moderators = db.query(User).filter(User.role == UserRole.moderator, User.is_deleted == False).all()
    result = []
    for mod in moderators:
        sessions_today = db.query(ModerationSession).filter(
            ModerationSession.moderator_id == mod.id,
            ModerationSession.started_at >= today_start,
        ).all()

        posts_today = sum(s.posts_approved + s.posts_rejected + s.posts_skipped for s in sessions_today)

        recent_sessions = db.query(ModerationSession).filter(
            ModerationSession.moderator_id == mod.id,
            ModerationSession.started_at >= thirty_min_ago,
        ).all()
        posts_last_30min = sum(s.posts_approved + s.posts_rejected + s.posts_skipped for s in recent_sessions)

        active_session = db.query(ModerationSession).filter(
            ModerationSession.moderator_id == mod.id,
            ModerationSession.is_active == True,
        ).first()

        result.append({
            "moderator_id": str(mod.id),
            "moderator_name": mod.name or "—",
            # Phone exposed to admin and moderator roles
            "phone": mod.phone if current_user.role in {UserRole.admin, UserRole.moderator} else None,
            "is_online": active_session is not None,
            "posts_today": posts_today,
            "posts_last_30min": posts_last_30min,
            "sessions_today": len(sessions_today),
            "active_session_started_at": active_session.started_at.isoformat() if active_session else None,
        })

    return ApiResponse(success=True, data=result, message="Moderator activity fetched")


@router.get("/my-activity", response_model=ApiResponse[dict])
def my_moderation_activity(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_staff),
):
    """Personal moderation log: all ListingLog entries where actor_id == current user."""
    base_query = (
        db.query(ListingLog)
        .options(
            joinedload(ListingLog.listing).joinedload(Listing.images),
        )
        .filter(ListingLog.actor_id == current_user.id)
        .order_by(ListingLog.created_at.desc())
    )
    total = base_query.count()
    pages = math.ceil(total / limit) if total > 0 else 1
    logs = base_query.offset((page - 1) * limit).limit(limit).all()

    items = []
    for log in logs:
        listing = log.listing
        primary_url = None
        if listing and listing.images:
            primary_url = next((img.url for img in listing.images if img.is_primary), listing.images[0].url if listing.images else None)
        items.append({
            "log_id": str(log.id),
            "action": log.action,
            "from_status": log.from_status,
            "to_status": log.to_status,
            "reason": log.reason,
            "created_at": log.created_at.isoformat(),
            "listing": {
                "id": str(listing.id),
                "brand": listing.brand,
                "model": listing.model,
                "year": listing.year,
                "status": listing.status.value,
                "primary_image_url": primary_url,
            } if listing else None,
        })

    return ApiResponse(
        success=True,
        data={"items": items, "total": total, "page": page, "pages": pages},
        message="Activity fetched",
    )


@router.get("/moderator-logs/{moderator_id}", response_model=ApiResponse[dict])
def moderator_logs(
    moderator_id: str,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Admin-only: full chronological listing-log history for a specific staff member."""
    import uuid as _uuid
    try:
        mid = _uuid.UUID(moderator_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid moderator_id UUID")

    moderator = db.query(User).filter(User.id == mid).first()
    if not moderator:
        raise HTTPException(status_code=404, detail="Moderator not found")

    base_query = (
        db.query(ListingLog)
        .options(joinedload(ListingLog.listing).joinedload(Listing.images))
        .filter(ListingLog.actor_id == mid)
        .order_by(ListingLog.created_at.desc())
    )
    total = base_query.count()
    pages = math.ceil(total / limit) if total > 0 else 1
    logs = base_query.offset((page - 1) * limit).limit(limit).all()

    items = []
    for log in logs:
        listing = log.listing
        primary_url = None
        if listing and listing.images:
            primary_url = next((img.url for img in listing.images if img.is_primary), listing.images[0].url if listing.images else None)
        items.append({
            "log_id": str(log.id),
            "action": log.action,
            "from_status": log.from_status,
            "to_status": log.to_status,
            "reason": log.reason,
            "created_at": log.created_at.isoformat(),
            "listing": {
                "id": str(listing.id),
                "brand": listing.brand,
                "model": listing.model,
                "year": listing.year,
                "status": listing.status.value,
                "primary_image_url": primary_url,
            } if listing else None,
        })

    return ApiResponse(
        success=True,
        data={
            "moderator": {
                "id": str(moderator.id),
                "name": moderator.name,
                "phone": moderator.phone if current_user.role in {UserRole.admin, UserRole.moderator} else None,
                "role": moderator.role.value
            },
            "items": items,
            "total": total,
            "page": page,
            "pages": pages,
        },
        message="Moderator logs fetched",
    )


@router.get("/moderation/session/history", response_model=ApiResponse[list])
def session_history(db: Session = Depends(get_db), current_user: User = Depends(require_moderator)):
    """All past sessions for the current moderator, newest first (max 50)."""
    from app.models import ModerationSession
    sessions = (
        db.query(ModerationSession)
        .filter(ModerationSession.moderator_id == current_user.id)
        .order_by(ModerationSession.started_at.desc())
        .limit(50)
        .all()
    )
    result = []
    for s in sessions:
        total = s.posts_approved + s.posts_rejected + s.posts_skipped
        duration_sec = None
        if s.ended_at and s.started_at:
            duration_sec = int((s.ended_at - s.started_at).total_seconds())
        result.append({
            "session_id": str(s.id),
            "started_at": s.started_at.isoformat(),
            "ended_at": s.ended_at.isoformat() if s.ended_at else None,
            "duration_seconds": duration_sec,
            "posts_approved": s.posts_approved,
            "posts_rejected": s.posts_rejected,
            "posts_skipped": s.posts_skipped,
            "total": total,
            "is_active": s.is_active,
            "auto_ended": s.auto_ended,
            "timer_minutes": s.timer_minutes,
            "filters": {
                "date_from": s.filter_date_from.isoformat() if s.filter_date_from else None,
                "date_to": s.filter_date_to.isoformat() if s.filter_date_to else None,
                "type": s.filter_type,
                "city": s.filter_city,
                "brand": s.filter_brand,
            },
        })
    return ApiResponse(success=True, data=result, message="Session history fetched")


@router.get("/moderation/stats", response_model=ApiResponse[dict])
def moderator_stats(db: Session = Depends(get_db), current_user: User = Depends(require_moderator)):
    """Aggregated lifetime + today + week stats for the current moderator."""
    from app.models import ModerationSession
    from datetime import datetime, timedelta, timezone

    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)

    def _sum(sessions):
        return {
            "approved": sum(s.posts_approved for s in sessions),
            "rejected": sum(s.posts_rejected for s in sessions),
            "skipped": sum(s.posts_skipped for s in sessions),
            "total": sum(s.posts_approved + s.posts_rejected + s.posts_skipped for s in sessions),
            "sessions": len(sessions),
        }

    all_s = db.query(ModerationSession).filter(ModerationSession.moderator_id == current_user.id).all()
    today_s = [s for s in all_s if s.started_at >= today]
    week_s  = [s for s in all_s if s.started_at >= week_ago]

    all_stats   = _sum(all_s)
    avg = round(all_stats["total"] / len(all_s), 1) if all_s else 0

    return ApiResponse(success=True, data={
        "all_time": all_stats,
        "today": _sum(today_s),
        "this_week": _sum(week_s),
        "avg_posts_per_session": avg,
        "total_sessions": len(all_s),
    }, message="Moderator stats fetched")


# ---------------------------------------------------------------------------
# Moderator note
# ---------------------------------------------------------------------------

@router.post("/moderation/{listing_id}/note", response_model=ApiResponse[dict])
def add_moderator_note(
    listing_id: str,
    payload: NotePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_moderator),
):
    """Add or update a private moderator note on a listing."""
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    listing.moderator_note = payload.note.strip()
    db.commit()
    return ApiResponse(success=True, data={"listing_id": listing_id, "note": listing.moderator_note}, message="Note saved")


# ---------------------------------------------------------------------------
# Bulk moderation
# ---------------------------------------------------------------------------

@router.post("/moderation/bulk-approve", response_model=ApiResponse[dict])
def bulk_approve_listings(
    payload: BulkApprovePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_moderator),
):
    """Approve multiple pending listings at once (max 20)."""
    if len(payload.listing_ids) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 listings per bulk operation")
    from app.models import ModerationSession
    active_session = db.query(ModerationSession).filter(
        ModerationSession.moderator_id == current_user.id,
        ModerationSession.is_active == True
    ).first()
    approved = 0
    for lid in payload.listing_ids:
        listing = db.query(Listing).filter(Listing.id == lid, Listing.status == ListingStatus.pending).first()
        if listing:
            listing.status = ListingStatus.active
            listing.is_active = True
            listing.rejection_reason = None
            listing.moderated_by = current_user.id
            listing.locked_by = None
            listing.locked_at = None
            log_audit(db, current_user.id, "approve_listing", "listing", listing.id)
            approved += 1
    if active_session:
        active_session.posts_approved += approved
    db.commit()
    return ApiResponse(success=True, data={"approved": approved}, message=f"{approved} listings approved")


@router.post("/moderation/bulk-reject", response_model=ApiResponse[dict])
def bulk_reject_listings(
    payload: BulkRejectPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_moderator),
):
    """Reject multiple pending listings at once with the same reason (max 20)."""
    if len(payload.listing_ids) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 listings per bulk operation")
    from app.models import ModerationSession
    active_session = db.query(ModerationSession).filter(
        ModerationSession.moderator_id == current_user.id,
        ModerationSession.is_active == True
    ).first()
    rejected = 0
    for lid in payload.listing_ids:
        listing = db.query(Listing).filter(Listing.id == lid, Listing.status == ListingStatus.pending).first()
        if listing:
            listing.status = ListingStatus.rejected
            listing.is_active = False
            listing.rejection_reason = payload.reason
            listing.moderated_by = current_user.id
            listing.locked_by = None
            listing.locked_at = None
            log_audit(db, current_user.id, "reject_listing", "listing", listing.id, {"reason": payload.reason})
            rejected += 1
    if active_session:
        active_session.posts_rejected += rejected
    db.commit()
    return ApiResponse(success=True, data={"rejected": rejected}, message=f"{rejected} listings rejected")


# ---------------------------------------------------------------------------
# Audit logs
# ---------------------------------------------------------------------------

@router.get("/audit-logs", response_model=ApiResponse[dict])
def get_audit_logs(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    action: Optional[str] = None,
    target_type: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    """Paginated audit log of all admin actions. Admin only."""
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    if target_type:
        query = query.filter(AuditLog.target_type == target_type)
    total = query.count()
    pages = math.ceil(total / limit) if total > 0 else 1
    logs = query.order_by(AuditLog.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    result = []
    for log in logs:
        actor_name = None
        if log.actor:
            actor_name = log.actor.name or log.actor.phone
        result.append({
            "id": str(log.id),
            "actor_id": str(log.actor_id) if log.actor_id else None,
            "actor_name": actor_name,
            "action": log.action,
            "target_type": log.target_type,
            "target_id": str(log.target_id) if log.target_id else None,
            "details": log.details,
            "created_at": log.created_at.isoformat(),
        })
    return ApiResponse(success=True, data={"items": result, "total": total, "page": page, "pages": pages}, message="Audit logs fetched")


# ---------------------------------------------------------------------------
# Manager trend stats
# ---------------------------------------------------------------------------

@router.get("/manager/stats", response_model=ApiResponse[dict])
def manager_stats(db: Session = Depends(get_db), _: User = Depends(require_manager_or_admin)):
    """Trend stats for manager: today/week/month/all-time."""
    from datetime import datetime, timedelta, timezone
    from app.models import ModerationSession

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)
    month_start = now - timedelta(days=30)

    def _listing_stats(since):
        new_listings = db.query(Listing).filter(Listing.created_at >= since).count()
        approved = db.query(Listing).filter(Listing.status == ListingStatus.active, Listing.updated_at >= since).count()
        rejected = db.query(Listing).filter(Listing.status == ListingStatus.rejected, Listing.updated_at >= since).count()
        return {"new_listings": new_listings, "approved": approved, "rejected": rejected}

    def _user_stats(since):
        return db.query(User).filter(User.created_at >= since, User.is_deleted == False).count()

    today_data = _listing_stats(today_start)
    today_data["new_users"] = _user_stats(today_start)

    week_data = _listing_stats(week_start)
    week_data["new_users"] = _user_stats(week_start)

    month_data = _listing_stats(month_start)
    month_data["new_users"] = _user_stats(month_start)

    total_data = {
        "users": db.query(User).filter(User.is_deleted == False).count(),
        "listings": db.query(Listing).count(),
        "active": db.query(Listing).filter(Listing.status == ListingStatus.active).count(),
        "pending": db.query(Listing).filter(Listing.status == ListingStatus.pending).count(),
        "rejected": db.query(Listing).filter(Listing.status == ListingStatus.rejected).count(),
        "dealers": db.query(Dealer).count(),
    }

    return ApiResponse(success=True, data={
        "today": today_data,
        "week": week_data,
        "month": month_data,
        "total": total_data,
    }, message="Manager stats fetched")


# ---------------------------------------------------------------------------
# Support stats
# ---------------------------------------------------------------------------

@router.get("/support/stats", response_model=ApiResponse[dict])
def support_stats(db: Session = Depends(get_db), _: User = Depends(require_support_or_above)):
    """Stats overview for support role."""
    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    total_users = db.query(User).filter(User.is_deleted == False).count()
    banned_users = db.query(User).filter(User.is_banned == True, User.is_deleted == False).count()
    total_listings = db.query(Listing).count()
    active_listings = db.query(Listing).filter(Listing.status == ListingStatus.active).count()
    pending_listings = db.query(Listing).filter(Listing.status == ListingStatus.pending).count()
    rejected_listings = db.query(Listing).filter(Listing.status == ListingStatus.rejected).count()
    total_dealers = db.query(Dealer).count()
    verified_dealers = db.query(Dealer).filter(Dealer.verified == True).count()
    today_new_users = db.query(User).filter(User.created_at >= today_start, User.is_deleted == False).count()
    today_new_listings = db.query(Listing).filter(Listing.created_at >= today_start).count()

    return ApiResponse(success=True, data={
        "total_users": total_users,
        "banned_users": banned_users,
        "total_listings": total_listings,
        "active_listings": active_listings,
        "pending_listings": pending_listings,
        "rejected_listings": rejected_listings,
        "total_dealers": total_dealers,
        "verified_dealers": verified_dealers,
        "today_new_users": today_new_users,
        "today_new_listings": today_new_listings,
    }, message="Support stats fetched")


# ---------------------------------------------------------------------------
# Listing analytics (admin)
# ---------------------------------------------------------------------------

@router.get("/listings/stats", response_model=ApiResponse[dict])
def listing_stats(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    """Listing analytics: top brands, cities, fuel types."""
    from sqlalchemy import func as sqlfunc

    top_brands = (
        db.query(Listing.brand, sqlfunc.count(Listing.id).label("count"))
        .filter(Listing.status == ListingStatus.active)
        .group_by(Listing.brand)
        .order_by(sqlfunc.count(Listing.id).desc())
        .limit(10)
        .all()
    )
    top_cities = (
        db.query(Listing.city, sqlfunc.count(Listing.id).label("count"))
        .filter(Listing.status == ListingStatus.active)
        .group_by(Listing.city)
        .order_by(sqlfunc.count(Listing.id).desc())
        .limit(10)
        .all()
    )
    by_fuel = (
        db.query(Listing.fuel, sqlfunc.count(Listing.id).label("count"))
        .filter(Listing.status == ListingStatus.active)
        .group_by(Listing.fuel)
        .all()
    )
    by_type = (
        db.query(Listing.type, sqlfunc.count(Listing.id).label("count"))
        .group_by(Listing.type)
        .all()
    )

    return ApiResponse(success=True, data={
        "top_brands": [{"brand": r.brand, "count": r.count} for r in top_brands],
        "top_cities": [{"city": r.city, "count": r.count} for r in top_cities],
        "by_fuel": [{"fuel": str(r.fuel.value) if r.fuel else None, "count": r.count} for r in by_fuel],
        "by_type": [{"type": str(r.type.value) if r.type else None, "count": r.count} for r in by_type],
    }, message="Listing stats fetched")
