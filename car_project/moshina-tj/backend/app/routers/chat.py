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

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.auth import _decode_token, get_current_user
from app.database import SessionLocal, get_db
from app.email_service import send_email_otp
from app.models import Conversation, ConversationType, Message, Notification, NotificationType, User, UserRole
from app.schemas import ApiResponse
from app.websockets import manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/conversations", tags=["chat"])


# ---------------------------------------------------------------------------
# Pydantic schemas (chat-local — small enough to keep inline)
# ---------------------------------------------------------------------------

class ConversationCreateBody(BaseModel):
    participant_id: Optional[_uuid.UUID] = None
    listing_id: Optional[_uuid.UUID] = None
    type: ConversationType = ConversationType.direct


class SendMessageBody(BaseModel):
    content: str


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


class ConversationOut(BaseModel):
    id: _uuid.UUID
    type: ConversationType
    other_participant: Optional[ParticipantOut] = None
    listing_id: Optional[_uuid.UUID] = None
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

    return ConversationOut(
        id=conv.id,
        type=conv.type,
        other_participant=other_out,
        listing_id=conv.listing_id,
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
        )
        .filter(Conversation.id == conv_id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    if conv.participant1_id != current_user.id and conv.participant2_id != current_user.id:
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

def _send_offline_email(recipient_email: str, sender_name: str) -> None:
    """Fire-and-forget email to notify an offline user of a new message."""
    send_email_otp(
        to_email=recipient_email,
        code="",
        purpose="message_notify",
    )


def _notify_offline_recipient(recipient_email: Optional[str], sender_name: Optional[str]) -> None:
    """Background task: email the recipient if they are offline."""
    if not recipient_email:
        return
    import os

    api_key = os.getenv("RESEND_API_KEY", "")
    from_addr = os.getenv("RESEND_FROM_EMAIL", "TajCar.tj <noreply@tajcar.tj>")
    subject = "Новое сообщение на TajCar.tj"
    body_text = (
        f"У вас новое сообщение от {sender_name or 'пользователя'} на TajCar.tj. "
        "Войдите на сайт, чтобы ответить."
    )
    if not api_key:
        logger.warning("[DEV MODE] Offline message email to %s | %s", recipient_email, subject)
        return
    try:
        import resend  # type: ignore[import-untyped]

        resend.api_key = api_key
        resend.Emails.send(
            {
                "from": from_addr,
                "to": recipient_email,
                "subject": subject,
                "html": f"<p>{body_text}</p>",
            }
        )
    except Exception:
        logger.exception("Failed to send offline-message email to %s", recipient_email)


@router.post("/{conv_id}/messages", response_model=ApiResponse[MessageOut], status_code=status.HTTP_201_CREATED)
def send_message(
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
    finally:
        db.close()

    # Push real-time event to recipient (non-blocking, runs in async context)
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

    import asyncio

    loop = asyncio.get_event_loop()
    if recipient_id_str:
        if manager.is_online(recipient_id_str):
            loop.create_task(manager.send_to_user(recipient_id_str, ws_payload))
        else:
            # Recipient is offline — enqueue email notification as background task
            background_tasks.add_task(_notify_offline_recipient, recipient_email, sender_name)

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
    """Extract and validate a JWT from ?token= or cookie. Returns user_id or None."""
    token: Optional[str] = websocket.query_params.get("token")
    if not token:
        token = websocket.cookies.get("token")
    if not token:
        return None
    try:
        payload = _decode_token(token)
        return payload.get("sub")
    except Exception:
        return None


# WebSocket router lives outside the /conversations prefix so we register it separately.
ws_router = APIRouter(tags=["chat-ws"])


@ws_router.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    """Real-time chat WebSocket.

    Auth: pass JWT as ?token=<jwt> query param or in the `token` cookie.
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

                    asyncio.get_event_loop().run_in_executor(
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
