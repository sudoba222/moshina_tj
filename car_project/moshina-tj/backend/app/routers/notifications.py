"""Notifications router.

  GET  /notifications              list my notifications (paginated)
  GET  /notifications/unread-count returns {count: int}
  PUT  /notifications/{id}/read   mark one notification as read
  PUT  /notifications/read-all    mark all as read
"""
import math
import uuid as _uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Notification, NotificationType, User
from app.schemas import ApiResponse

router = APIRouter(prefix="/notifications", tags=["notifications"])


# ---------------------------------------------------------------------------
# Local response schemas
# ---------------------------------------------------------------------------

class NotificationOut(BaseModel):
    id: _uuid.UUID
    type: NotificationType
    title: str
    body: str
    link: Optional[str] = None
    is_read: bool
    created_at: str  # ISO-8601


class NotificationPageOut(BaseModel):
    items: list[NotificationOut]
    total: int
    page: int
    pages: int


class UnreadCountOut(BaseModel):
    count: int


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _notification_to_out(n: Notification) -> NotificationOut:
    return NotificationOut(
        id=n.id,
        type=n.type,
        title=n.title,
        body=n.body,
        link=n.link,
        is_read=n.is_read,
        created_at=n.created_at.isoformat(),
    )


# ---------------------------------------------------------------------------
# List notifications
# ---------------------------------------------------------------------------

@router.get("", response_model=ApiResponse[NotificationPageOut])
def list_notifications(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    base = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
    )
    total = base.count()
    pages = math.ceil(total / limit) if total > 0 else 1
    items = base.offset((page - 1) * limit).limit(limit).all()
    out = [_notification_to_out(n) for n in items]

    return ApiResponse(
        success=True,
        data=NotificationPageOut(items=out, total=total, page=page, pages=pages),
        message="Notifications fetched",
    )


# ---------------------------------------------------------------------------
# Unread count
# ---------------------------------------------------------------------------

@router.get("/unread-count", response_model=ApiResponse[UnreadCountOut])
def unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.is_read == False,  # noqa: E712
        )
        .count()
    )
    return ApiResponse(success=True, data=UnreadCountOut(count=count), message="Unread count")


# ---------------------------------------------------------------------------
# Mark all as read  — declared BEFORE /{notification_id}/read to prevent
# the wildcard from swallowing the literal "read-all" segment.
# ---------------------------------------------------------------------------

@router.put("/read-all", response_model=ApiResponse[None])
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,  # noqa: E712
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()
    return ApiResponse(success=True, data=None, message="All notifications marked as read")


# ---------------------------------------------------------------------------
# Mark one notification as read
# ---------------------------------------------------------------------------

@router.put("/{notification_id}/read", response_model=ApiResponse[None])
def mark_one_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    n = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
        .first()
    )
    if not n:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    n.is_read = True
    db.commit()
    return ApiResponse(success=True, data=None, message="Notification marked as read")
