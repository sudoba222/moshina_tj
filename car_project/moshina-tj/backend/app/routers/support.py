"""Support ticket router.

  GET  /support/tickets              (support/admin) list all support conversations
  POST /support/tickets              (any auth user)  create a support conversation
  POST /support/assign/{conv_id}     (support/admin)  assign conversation to self
  PUT  /support/close/{conv_id}      (support/admin)  mark ticket as closed
"""
import uuid as _uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import get_db
from app.models import Conversation, ConversationType, Message, User, UserRole
from app.schemas import ApiResponse

router = APIRouter(prefix="/support", tags=["support"])


_SUPPORT_ROLES = {UserRole.support, UserRole.admin}


def _require_support(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in _SUPPORT_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Support or Admin role required",
        )
    return current_user


class ParticipantOut(BaseModel):
    id: _uuid.UUID
    name: Optional[str] = None
    avatar_url: Optional[str] = None


class LastMsgOut(BaseModel):
    content: str
    sender_id: _uuid.UUID
    created_at: str


class SupportTicketOut(BaseModel):
    id: _uuid.UUID
    type: ConversationType
    participant: Optional[ParticipantOut] = None
    assignee: Optional[ParticipantOut] = None
    last_message: Optional[LastMsgOut] = None
    unread_count: int = 0
    is_closed: bool = False
    created_at: str
    updated_at: str


def _conv_to_ticket(conv: Conversation, agent_id: Optional[_uuid.UUID] = None) -> SupportTicketOut:
    p1 = conv.participant1
    p2 = conv.participant2

    participant_out = (
        ParticipantOut(id=p1.id, name=p1.name, avatar_url=p1.avatar_url) if p1 else None
    )
    assignee_out = (
        ParticipantOut(id=p2.id, name=p2.name, avatar_url=p2.avatar_url) if p2 else None
    )

    last_msg_out: Optional[LastMsgOut] = None
    unread_count = 0
    if conv.messages:
        sorted_msgs = sorted(conv.messages, key=lambda m: m.created_at)
        last = sorted_msgs[-1]
        last_msg_out = LastMsgOut(
            content=last.content[:200],
            sender_id=last.sender_id,
            created_at=last.created_at.isoformat(),
        )
        # Unread = messages NOT sent by the support agent
        if agent_id:
            unread_count = sum(
                1 for m in sorted_msgs
                if not m.is_read and m.sender_id != agent_id
            )
        else:
            unread_count = sum(1 for m in sorted_msgs if not m.is_read)

    # "Closed" heuristic: assigned + last message is from support (not user)
    is_closed = False
    if p2 and conv.messages:
        last_msg = sorted(conv.messages, key=lambda m: m.created_at)[-1]
        is_closed = last_msg.sender_id == p2.id

    return SupportTicketOut(
        id=conv.id,
        type=conv.type,
        participant=participant_out,
        assignee=assignee_out,
        last_message=last_msg_out,
        unread_count=unread_count,
        is_closed=is_closed,
        created_at=conv.created_at.isoformat(),
        updated_at=conv.updated_at.isoformat(),
    )


# ---------------------------------------------------------------------------
# GET /support/tickets — list all support conversations
# ---------------------------------------------------------------------------

@router.get("/tickets", response_model=ApiResponse[list[SupportTicketOut]])
def list_support_tickets(
    current_user: User = Depends(_require_support),
    db: Session = Depends(get_db),
):
    convs = (
        db.query(Conversation)
        .options(
            joinedload(Conversation.participant1),
            joinedload(Conversation.participant2),
            joinedload(Conversation.messages),
        )
        .filter(Conversation.type == ConversationType.support)
        .order_by(Conversation.updated_at.desc())
        .all()
    )
    data = [_conv_to_ticket(c, current_user.id) for c in convs]
    return ApiResponse(success=True, data=data, message="Support tickets fetched")


# ---------------------------------------------------------------------------
# POST /support/tickets — any user creates a support conversation
# ---------------------------------------------------------------------------

@router.post("/tickets", response_model=ApiResponse[SupportTicketOut], status_code=status.HTTP_201_CREATED)
def create_support_ticket(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Reuse existing open ticket if user already has one
    existing = (
        db.query(Conversation)
        .options(
            joinedload(Conversation.participant1),
            joinedload(Conversation.participant2),
            joinedload(Conversation.messages),
        )
        .filter(
            Conversation.type == ConversationType.support,
            Conversation.participant1_id == current_user.id,
        )
        .order_by(Conversation.created_at.desc())
        .first()
    )
    if existing:
        return ApiResponse(success=True, data=_conv_to_ticket(existing), message="Existing support ticket returned")

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
            joinedload(Conversation.messages),
        )
        .filter(Conversation.id == conv.id)
        .first()
    )
    data = _conv_to_ticket(conv)
    return ApiResponse(success=True, data=data, message="Support ticket created")


# ---------------------------------------------------------------------------
# POST /support/assign/{conv_id} — support agent assigns to self
# ---------------------------------------------------------------------------

@router.post("/assign/{conv_id}", response_model=ApiResponse[SupportTicketOut])
def assign_ticket(
    conv_id: str,
    current_user: User = Depends(_require_support),
    db: Session = Depends(get_db),
):
    conv = (
        db.query(Conversation)
        .options(
            joinedload(Conversation.participant1),
            joinedload(Conversation.participant2),
            joinedload(Conversation.messages),
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
    conv = (
        db.query(Conversation)
        .options(
            joinedload(Conversation.participant1),
            joinedload(Conversation.participant2),
            joinedload(Conversation.messages),
        )
        .filter(Conversation.id == conv_id)
        .first()
    )
    data = _conv_to_ticket(conv, current_user.id)
    return ApiResponse(success=True, data=data, message="Ticket assigned")


# ---------------------------------------------------------------------------
# PUT /support/close/{conv_id} — mark ticket as closed
# ---------------------------------------------------------------------------

@router.put("/close/{conv_id}", response_model=ApiResponse[SupportTicketOut])
def close_ticket(
    conv_id: str,
    current_user: User = Depends(_require_support),
    db: Session = Depends(get_db),
):
    """Mark all messages as read and ensure ticket is assigned to current agent."""
    conv = (
        db.query(Conversation)
        .options(
            joinedload(Conversation.participant1),
            joinedload(Conversation.participant2),
            joinedload(Conversation.messages),
        )
        .filter(
            Conversation.id == conv_id,
            Conversation.type == ConversationType.support,
        )
        .first()
    )
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Support ticket not found")
    if not conv.participant2_id:
        conv.participant2_id = current_user.id
    db.query(Message).filter(
        Message.conversation_id == conv_id,
        Message.is_read == False,  # noqa: E712
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()
    conv = (
        db.query(Conversation)
        .options(
            joinedload(Conversation.participant1),
            joinedload(Conversation.participant2),
            joinedload(Conversation.messages),
        )
        .filter(Conversation.id == conv_id)
        .first()
    )
    data = _conv_to_ticket(conv, current_user.id)
    return ApiResponse(success=True, data=data, message="Ticket closed")
