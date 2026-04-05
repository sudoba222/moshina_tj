"""Chat router — REST endpoints + WebSocket handler.

REST:
  GET  /conversations                        list my conversations
  POST /conversations                        create or get existing conversation
  GET  /conversations/{id}/messages          paginated message history
  POST /conversations/{id}/messages          send a message
  PUT  /conversations/{id}/read              mark all messages as read

WebSocket:
  WS   /ws/chat                              real-time messaging
       Auth via ?token=<jwt> query param or cookie named 'token'
"""
import json
import logging
import math
import uuid as _uuid
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel, field_validator
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session, joinedload

from app.auth import _decode_token, get_current_user
from app.database import SessionLocal, get_db
from app.email_service import send_email_otp, send_new_message_notification
from app.services.telegram_notifier import send_telegram_notification
from app.models import Conversation, ConversationType, Listing, ListingImage, Message, Notification, NotificationType, User, UserRole
from app.schemas import ApiResponse
from app.websockets import manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/conversations", tags=["chat"])
limiter = Limiter(key_func=get_remote_address)


# ---------------------------------------------------------------------------
# Pydantic schemas (chat-local — small enough to keep inline)
# ---------------------------------------------------------------------------

class ConversationCreateBody(BaseModel):
    participant_id: Optional[_uuid.UUID] = None
    listing_id: Optional[_uuid.UUID] = None
    type: ConversationType = ConversationType.direct


class SendMessageBody(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def content_not_empty_and_max_length(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Message content cannot be empty")
        if len(v) > 10_000:
            raise ValueError("Message too long (max 10 000 chars)")
        return v


class ParticipantOut(BaseModel):
    id: _uuid.UUID
    name: Optional[str] = None
    avatar_url: Optional[str] = None


class LastMessageOut(BaseModel):
    id: _uuid.UUID
    content: str
    sender_id: _uuid.UUID
    is_read: bool
    created_at: str  # ISO-8601 string


class ListingPreviewOut(BaseModel):
    id: _uuid.UUID
    brand: str
    model: str
    year: int
    price: float
    image_url: Optional[str] = None


class ConversationOut(BaseModel):
    id: _uuid.UUID
    type: ConversationType
    other_participant: Optional[ParticipantOut] = None
    listing: Optional[ListingPreviewOut] = None
    last_message: Optional[LastMessageOut] = None
    updated_at: str


class MessageOut(BaseModel):
    id: _uuid.UUID
    conversation_id: _uuid.UUID
    sender_id: _uuid.UUID
    content: str
    is_read: bool
    created_at: str


class MessagePageOut(BaseModel):
    items: list[MessageOut]
    total: int
    page: int
    pages: int


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_conversation_out(conv: Conversation, current_user_id) -> ConversationOut:
    """Build the public-facing ConversationOut from an ORM object."""
    if conv.participant1_id == current_user_id:
        other = conv.participant2
    else:
        other = conv.participant1

    other_out: Optional[ParticipantOut] = None
    if other:
        other_out = ParticipantOut(
            id=other.id,
            name=other.name,
            avatar_url=other.avatar_url,
        )

    last_msg: Optional[LastMessageOut] = None
    if conv.messages:
        # messages are ordered asc; last element is newest
        m = conv.messages[-1]
        last_msg = LastMessageOut(
            id=m.id,
            content=m.content,
            sender_id=m.sender_id,
            is_read=m.is_read,
            created_at=m.created_at.isoformat(),
        )

    listing_preview: Optional[ListingPreviewOut] = None
    if conv.listing:
        primary = next(
            (img for img in conv.listing.images if img.is_primary),
            conv.listing.images[0] if conv.listing.images else None,
        )
        listing_preview = ListingPreviewOut(
            id=conv.listing.id,
            brand=conv.listing.brand,
            model=conv.listing.model,
            year=conv.listing.year,
            price=float(conv.listing.price),
            image_url=primary.url if primary else None,
        )

    return ConversationOut(
        id=conv.id,
        type=conv.type,
        other_participant=other_out,
        listing=listing_preview,
        last_message=last_msg,
        updated_at=conv.updated_at.isoformat(),
    )


def _get_conversation_or_403(conv_id: str, current_user: User, db: Session) -> Conversation:
    conv = (
        db.query(Conversation)
        .options(
            joinedload(Conversation.participant1),
            joinedload(Conversation.participant2),
            joinedload(Conversation.messages),
            joinedload(Conversation.listing).joinedload(Listing.images),
        )
        .filter(Conversation.id == conv_id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    _SUPPORT_ROLES = {UserRole.support, UserRole.admin}
    is_participant = (
        conv.participant1_id == current_user.id
        or conv.participant2_id == current_user.id
    )
    is_support_ticket = conv.type == ConversationType.support and current_user.role in _SUPPORT_ROLES
    if not is_participant and not is_support_ticket:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return conv


# ---------------------------------------------------------------------------
# REST: list conversations
# ---------------------------------------------------------------------------

@router.get("", response_model=ApiResponse[list[ConversationOut]])
def list_conversations(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        convs = (
            db.query(Conversation)
            .options(
                joinedload(Conversation.participant1),
                joinedload(Conversation.participant2),
                joinedload(Conversation.messages),
                joinedload(Conversation.listing).joinedload(Listing.images),
            )
            .filter(
                (Conversation.participant1_id == current_user.id)
                | (Conversation.participant2_id == current_user.id)
            )
            .order_by(Conversation.updated_at.desc())
            .all()
        )
        current_user_id = current_user.id
        data = [_build_conversation_out(c, current_user_id) for c in convs]
    finally:
        db.close()
    return ApiResponse(success=True, data=data, message="Conversations fetched")


# ---------------------------------------------------------------------------
# REST: create or get conversation
# ---------------------------------------------------------------------------

@router.post("", response_model=ApiResponse[ConversationOut], status_code=status.HTTP_200_OK)
def create_or_get_conversation(
    body: ConversationCreateBody,
    current_user: User = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        conv_type = body.type

        if conv_type == ConversationType.support:
            # Support ticket — participant1 is user, participant2 is unassigned (null)
            conv = Conversation(
                type=ConversationType.support,
                participant1_id=current_user.id,
                participant2_id=None,
                listing_id=None,
            )
            db.add(conv)
            db.commit()
            db.refresh(conv)
            # Eager load for response
            conv = (
                db.query(Conversation)
                .options(
                    joinedload(Conversation.participant1),
                    joinedload(Conversation.participant2),
                    joinedload(Conversation.messages),
                    joinedload(Conversation.listing).joinedload(Listing.images),
                )
                .filter(Conversation.id == conv.id)
                .first()
            )
            return ApiResponse(
                success=True,
                data=_build_conversation_out(conv, current_user.id),
                message="Support conversation created",
            )

        # Direct conversation
        if not body.participant_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="participant_id is required for direct conversations",
            )

        if body.participant_id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Cannot start a conversation with yourself",
            )

        # Determine canonical participant order (lower UUID first) for
        # consistent unique constraint matching.
        uid = current_user.id
        pid = body.participant_id
        if uid < pid:
            p1_id, p2_id = uid, pid
        else:
            p1_id, p2_id = pid, uid

        listing_id = body.listing_id

        # Find existing — handle nullable listing_id
        query = db.query(Conversation).filter(
            Conversation.participant1_id == p1_id,
            Conversation.participant2_id == p2_id,
        )
        if listing_id is None:
            query = query.filter(Conversation.listing_id.is_(None))
        else:
            query = query.filter(Conversation.listing_id == listing_id)

        existing = (
            query
            .options(
                joinedload(Conversation.participant1),
                joinedload(Conversation.participant2),
                joinedload(Conversation.messages),
                joinedload(Conversation.listing).joinedload(Listing.images),
            )
            .first()
        )
        if existing:
            return ApiResponse(
                success=True,
                data=_build_conversation_out(existing, current_user.id),
                message="Existing conversation returned",
            )

        conv = Conversation(
            type=ConversationType.direct,
            participant1_id=p1_id,
            participant2_id=p2_id,
            listing_id=listing_id,
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
                joinedload(Conversation.listing).joinedload(Listing.images),
            )
            .filter(Conversation.id == conv.id)
            .first()
        )
        return ApiResponse(
            success=True,
            data=_build_conversation_out(conv, current_user.id),
            message="Conversation created",
        )
    finally:
        db.close()


# ---------------------------------------------------------------------------
# REST: paginated message history
# ---------------------------------------------------------------------------

@router.get("/{conv_id}/messages", response_model=ApiResponse[MessagePageOut])
def list_messages(
    conv_id: str,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=30, ge=1, le=100),
    current_user: User = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        _get_conversation_or_403(conv_id, current_user, db)

        base = db.query(Message).filter(Message.conversation_id == conv_id)
        total = base.count()
        pages = math.ceil(total / limit) if total > 0 else 1
        msgs = (
            base
            .order_by(Message.created_at.asc())
            .offset((page - 1) * limit)
            .limit(limit)
            .all()
        )

        items = [
            MessageOut(
                id=m.id,
                conversation_id=m.conversation_id,
                sender_id=m.sender_id,
                content=m.content,
                is_read=m.is_read,
                created_at=m.created_at.isoformat(),
            )
            for m in msgs
        ]
        total_val = total
        page_val = page
        pages_val = pages
    finally:
        db.close()

    return ApiResponse(
        success=True,
        data=MessagePageOut(items=items, total=total_val, page=page_val, pages=pages_val),
        message="Messages fetched",
    )


# ---------------------------------------------------------------------------
# REST: send a message
# ---------------------------------------------------------------------------

def _notify_offline_recipient(recipient_email: Optional[str], sender_name: Optional[str]) -> None:
    """Background task: email the recipient if they are offline."""
    if not recipient_email:
        return
    send_new_message_notification(
        to_email=recipient_email,
        sender_name=sender_name,
        message_preview=None,
        chat_url="https://tajcar.tj/chat",
    )


@router.post("/{conv_id}/messages", response_model=ApiResponse[MessageOut], status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute")
def send_message(
    request: Request,
    conv_id: str,
    body: SendMessageBody,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    content = body.content.strip()
    if not content:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Message content cannot be empty")
    if len(content) > 10000:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Message too long (max 10 000 chars)")

    db = SessionLocal()
    try:
        conv = _get_conversation_or_403(conv_id, current_user, db)

        msg = Message(
            conversation_id=conv.id,
            sender_id=current_user.id,
            content=content,
        )
        db.add(msg)

        # Touch conversation updated_at so conversations sort correctly
        conv.updated_at = __import__("sqlalchemy").func.now()

        db.commit()
        db.refresh(msg)

        # Read scalars before close
        msg_id = msg.id
        msg_conv_id = msg.conversation_id
        msg_sender_id = msg.sender_id
        msg_content = msg.content
        msg_is_read = msg.is_read
        msg_created_at = msg.created_at.isoformat()

        # Determine recipient
        if conv.participant1_id == current_user.id:
            recipient_id = conv.participant2_id
            recipient = conv.participant2
        else:
            recipient_id = conv.participant1_id
            recipient = conv.participant1

        recipient_email: Optional[str] = recipient.email if recipient else None
        recipient_id_str: Optional[str] = str(recipient_id) if recipient_id else None
        sender_name: Optional[str] = current_user.name
        conv_type = conv.type
        conv_id_str = str(conv.id)
    finally:
        db.close()

    # Push real-time event to recipient (non-blocking)
    ws_payload = {
        "event": "new_message",
        "conversation_id": str(msg_conv_id),
        "message": {
            "id": str(msg_id),
            "sender_id": str(msg_sender_id),
            "content": msg_content,
            "is_read": msg_is_read,
            "created_at": msg_created_at,
        },
    }

    if conv_type == ConversationType.support and str(msg_sender_id) != recipient_id_str:
        # User wrote to support — notify ALL online support/admin agents
        db2 = SessionLocal()
        try:
            support_agents = db2.query(User).filter(
                User.role.in_([UserRole.support, UserRole.admin]),
                User.is_deleted == False,  # noqa: E712
                User.is_banned == False,  # noqa: E712
            ).all()
            offline_agents = []
            for agent in support_agents:
                agent_id_str = str(agent.id)
                if manager.is_online(agent_id_str):
                    background_tasks.add_task(manager.send_to_user, agent_id_str, ws_payload)
                else:
                    offline_agents.append(agent)
            # Create DB notifications for offline support agents
            for agent in offline_agents:
                notif = Notification(
                    user_id=agent.id,
                    type=NotificationType.message,
                    title="Новое обращение в поддержку",
                    body=f"{sender_name or 'Пользователь'}: {msg_content[:100]}",
                    link=f"/support?tab=messages&conv={conv_id_str}",
                )
                db2.add(notif)
            db2.commit()
        except Exception:
            logger.exception("Failed to notify support agents")
        finally:
            db2.close()
    elif recipient_id_str:
        # Direct message or support agent replying to user
        if manager.is_online(recipient_id_str):
            background_tasks.add_task(manager.send_to_user, recipient_id_str, ws_payload)
        else:
            background_tasks.add_task(_notify_offline_recipient, recipient_email, sender_name)
            background_tasks.add_task(
                send_telegram_notification,
                _uuid.UUID(recipient_id_str),
                "new_message",
                {
                    "sender_name": sender_name or "",
                    "preview": msg_content,
                    "conversation_id": str(msg_conv_id),
                },
            )
            # Also create a DB notification for the offline recipient
            db2 = SessionLocal()
            try:
                notif = Notification(
                    user_id=_uuid.UUID(recipient_id_str),
                    type=NotificationType.message,
                    title=f"Новое сообщение от {sender_name or 'пользователя'}",
                    body=msg_content[:100],
                    link=f"/dashboard?tab=messages&conv={str(msg_conv_id)}",
                )
                db2.add(notif)
                db2.commit()
            except Exception:
                logger.exception("Failed to create message notification")
            finally:
                db2.close()

    out = MessageOut(
        id=msg_id,
        conversation_id=msg_conv_id,
        sender_id=msg_sender_id,
        content=msg_content,
        is_read=msg_is_read,
        created_at=msg_created_at,
    )
    return ApiResponse(success=True, data=out, message="Message sent")


# ---------------------------------------------------------------------------
# REST: mark all messages as read
# ---------------------------------------------------------------------------

@router.put("/{conv_id}/read", response_model=ApiResponse[None])
def mark_conversation_read(
    conv_id: str,
    current_user: User = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        _get_conversation_or_403(conv_id, current_user, db)

        db.query(Message).filter(
            Message.conversation_id == conv_id,
            Message.sender_id != current_user.id,
            Message.is_read == False,  # noqa: E712
        ).update({"is_read": True}, synchronize_session=False)
        db.commit()
    finally:
        db.close()
    return ApiResponse(success=True, data=None, message="Conversation marked as read")


# ---------------------------------------------------------------------------
# WebSocket: /ws/chat
# ---------------------------------------------------------------------------

async def _ws_authenticate(websocket: WebSocket) -> Optional[str]:
    """Extract and validate a JWT from the HttpOnly auth cookie.

    Performs a full DB check — verifies token_version (revocation) and
    ban status — so that a logged-out or banned user cannot keep a WS
    connection open on an old token.

    Returns user_id (str) or None on failure.
    Token in URL query params is intentionally not supported — it would
    expose the JWT in server access logs.
    """
    token: Optional[str] = websocket.cookies.get("token")
    if not token:
        return None
    try:
        payload = _decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            return None
        db = SessionLocal()
        try:
            from app.models import User as _User
            user = db.query(_User).filter(
                _User.id == user_id,
                _User.is_deleted == False,  # noqa: E712
            ).first()
            if user is None or user.is_banned:
                return None
            if payload.get("ver", 0) != user.token_version:
                return None
            return str(user.id)
        finally:
            db.close()
    except Exception:
        return None


# WebSocket router lives outside the /conversations prefix so we register it separately.
ws_router = APIRouter(tags=["chat-ws"])


@ws_router.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    """Real-time chat WebSocket.

    Auth: JWT must be present in the `token` HttpOnly cookie.
    Query param token is intentionally NOT supported (would expose JWT in server logs).
    On connection failure the socket is closed with code 1008 (Policy Violation).

    Incoming JSON format:
        {"conversation_id": "<uuid>", "content": "<text>"}

    Outgoing JSON format (pushed to recipient):
        {"event": "new_message", "conversation_id": "...", "message": {...}}
    """
    user_id = await _ws_authenticate(websocket)
    if not user_id:
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, user_id)
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
                conversation_id = data.get("conversation_id")
                content = (data.get("content") or "").strip()
            except (json.JSONDecodeError, AttributeError):
                await websocket.send_text(json.dumps({"error": "Invalid JSON"}))
                continue

            if not conversation_id or not content:
                await websocket.send_text(json.dumps({"error": "conversation_id and content are required"}))
                continue

            if len(content) > 10000:
                await websocket.send_text(json.dumps({"error": "Message too long"}))
                continue

            db = SessionLocal()
            try:
                conv = (
                    db.query(Conversation)
                    .options(
                        joinedload(Conversation.participant1),
                        joinedload(Conversation.participant2),
                    )
                    .filter(Conversation.id == conversation_id)
                    .first()
                )
                if not conv:
                    await websocket.send_text(json.dumps({"error": "Conversation not found"}))
                    continue

                if str(conv.participant1_id) != user_id and str(conv.participant2_id) != user_id:
                    await websocket.send_text(json.dumps({"error": "Access denied"}))
                    continue

                msg = Message(
                    conversation_id=conv.id,
                    sender_id=_uuid.UUID(user_id),
                    content=content,
                )
                db.add(msg)
                db.commit()
                db.refresh(msg)

                msg_id = str(msg.id)
                msg_created_at = msg.created_at.isoformat()

                if str(conv.participant1_id) == user_id:
                    recipient_id = str(conv.participant2_id) if conv.participant2_id else None
                    recipient_email = conv.participant2.email if conv.participant2 else None
                else:
                    recipient_id = str(conv.participant1_id)
                    recipient_email = conv.participant1.email if conv.participant1 else None
            finally:
                db.close()

            ws_payload = {
                "event": "new_message",
                "conversation_id": conversation_id,
                "message": {
                    "id": msg_id,
                    "sender_id": user_id,
                    "content": content,
                    "is_read": False,
                    "created_at": msg_created_at,
                },
            }

            # Echo back to sender
            await websocket.send_text(json.dumps(ws_payload))

            # Push to recipient
            if recipient_id:
                if manager.is_online(recipient_id):
                    await manager.send_to_user(recipient_id, ws_payload)
                else:
                    # Offline — send email notification in background
                    import asyncio
                    asyncio.get_running_loop().run_in_executor(
                        None,
                        _notify_offline_recipient,
                        recipient_email,
                        None,
                    )

    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception:
        logger.exception("Unexpected WebSocket error for user_id=%s", user_id)
        manager.disconnect(websocket, user_id)
