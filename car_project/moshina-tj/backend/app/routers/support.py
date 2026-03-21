"""Support ticket router.

  GET  /support/tickets              (support/admin) list all support conversations
  POST /support/tickets              (any auth user)  create a support conversation
  POST /support/assign/{conv_id}     (support/admin)  assign conversation to self
"""
import uuid as _uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import SessionLocal
from app.models import Conversation, ConversationType, User, UserRole
from app.schemas import ApiResponse

router = APIRouter(prefix="/support", tags=["support"])


# ---------------------------------------------------------------------------
# Permission helpers
# ---------------------------------------------------------------------------

_SUPPORT_ROLES = {UserRole.support, UserRole.admin}


def _require_support(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in _SUPPORT_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Support or Admin role required",
        )
    return current_user


# ---------------------------------------------------------------------------
# Local response schemas
# ---------------------------------------------------------------------------

class ParticipantOut(BaseModel):
    id: _uuid.UUID
    name: Optional[str] = None
    avatar_url: Optional[str] = None


class SupportTicketOut(BaseModel):
    id: _uuid.UUID
    type: ConversationType
    participant: Optional[ParticipantOut] = None   # the end-user who opened it
    assignee: Optional[ParticipantOut] = None      # support agent (participant2)
    created_at: str
    updated_at: str


def _conv_to_ticket(conv: Conversation) -> SupportTicketOut:
    p1 = conv.participant1
    p2 = conv.participant2

    participant_out = (
        ParticipantOut(id=p1.id, name=p1.name, avatar_url=p1.avatar_url)
        if p1
        else None
    )
    assignee_out = (
        ParticipantOut(id=p2.id, name=p2.name, avatar_url=p2.avatar_url)
        if p2
        else None
    )

    return SupportTicketOut(
        id=conv.id,
        type=conv.type,
        participant=participant_out,
        assignee=assignee_out,
        created_at=conv.created_at.isoformat(),
        updated_at=conv.updated_at.isoformat(),
    )


# ---------------------------------------------------------------------------
# GET /support/tickets — list all support conversations
# ---------------------------------------------------------------------------

@router.get("/tickets", response_model=ApiResponse[list[SupportTicketOut]])
def list_support_tickets(current_user: User = Depends(_require_support)):
    db = SessionLocal()
    try:
        convs = (
            db.query(Conversation)
            .options(
                joinedload(Conversation.participant1),
                joinedload(Conversation.participant2),
            )
            .filter(Conversation.type == ConversationType.support)
            .order_by(Conversation.updated_at.desc())
            .all()
        )
        data = [_conv_to_ticket(c) for c in convs]
    finally:
        db.close()

    return ApiResponse(success=True, data=data, message="Support tickets fetched")


# ---------------------------------------------------------------------------
# POST /support/tickets — any user creates a support conversation
# ---------------------------------------------------------------------------

@router.post("/tickets", response_model=ApiResponse[SupportTicketOut], status_code=status.HTTP_201_CREATED)
def create_support_ticket(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        conv = Conversation(
            type=ConversationType.support,
            participant1_id=current_user.id,
            participant2_id=None,
            listing_id=None,
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)

        conv = (
            db.query(Conversation)
            .options(
                joinedload(Conversation.participant1),
                joinedload(Conversation.participant2),
            )
            .filter(Conversation.id == conv.id)
            .first()
        )
        data = _conv_to_ticket(conv)
    finally:
        db.close()

    return ApiResponse(success=True, data=data, message="Support ticket created")


# ---------------------------------------------------------------------------
# POST /support/assign/{conv_id} — support agent assigns to self
# ---------------------------------------------------------------------------

@router.post("/assign/{conv_id}", response_model=ApiResponse[SupportTicketOut])
def assign_ticket(
    conv_id: str,
    current_user: User = Depends(_require_support),
):
    db = SessionLocal()
    try:
        conv = (
            db.query(Conversation)
            .options(
                joinedload(Conversation.participant1),
                joinedload(Conversation.participant2),
            )
            .filter(
                Conversation.id == conv_id,
                Conversation.type == ConversationType.support,
            )
            .first()
        )
        if not conv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Support ticket not found")

        conv.participant2_id = current_user.id
        db.commit()

        # Re-fetch with fresh participant2 loaded
        conv = (
            db.query(Conversation)
            .options(
                joinedload(Conversation.participant1),
                joinedload(Conversation.participant2),
            )
            .filter(Conversation.id == conv_id)
            .first()
        )
        data = _conv_to_ticket(conv)
    finally:
        db.close()

    return ApiResponse(success=True, data=data, message="Ticket assigned")
