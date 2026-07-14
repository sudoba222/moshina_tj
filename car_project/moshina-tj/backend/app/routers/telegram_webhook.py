"""Telegram bot webhook handler.

Register the webhook once:
  GET https://api.telegram.org/bot<TOKEN>/setWebhook
      ?url=https://api.tajcar.tj/api/v1/telegram/webhook
      &secret_token=<TELEGRAM_WEBHOOK_SECRET>

No separate process needed — Telegram POSTs updates to this endpoint.

Phone verification flow:
  1. User clicks deep link → /start <token> → bot asks to share phone
  2. User taps "Share phone" button → bot receives contact
  3. Bot compares contact phone with the phone stored in TelegramToken
  4. Match → generate and send OTP
  5. Mismatch → reject with clear error

Support relay flow:
  1. User taps "Support" button in main menu
  2. Bot sets user into support-awaiting state
  3. User sends a text message → forwarded to SUPPORT_TELEGRAM_CHAT_ID with user info header
  4. Admin replies to the forwarded message in their Telegram → bot relays reply back to user
"""
import asyncio
import hashlib
import hmac
import json
import logging
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import parse_qsl

from fastapi import APIRouter, HTTPException, Request, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models import OtpCode, TelegramToken, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/telegram", tags=["telegram"])

SITE_URL = settings.frontend_url

# ---------------------------------------------------------------------------
# In-memory state (ephemeral — resets on restart, fine for support flow)
# ---------------------------------------------------------------------------

# chat_id → True when user has tapped "Support" and we're awaiting their message
_support_state: dict[str, bool] = {}

# admin-side message_id → user chat_id (for admin reply relay)
_support_reply_map: dict[int, str] = {}

_LISTINGS_PER_PAGE = 5


# ---------------------------------------------------------------------------
# Helpers — Telegram API calls
# ---------------------------------------------------------------------------

def _normalize_phone(phone: str) -> str:
    digits = "".join(c for c in phone if c.isdigit())
    return "+" + digits


async def _tg_post(method: str, payload: dict[str, Any]) -> dict[str, Any]:
    """POST to the Telegram Bot API. Returns the full response JSON."""
    import httpx
    bot_token = settings.telegram_bot_token
    if not bot_token:
        return {}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"https://api.telegram.org/bot{bot_token}/{method}",
                json=payload,
            )
            return resp.json()
    except Exception:
        logger.exception("Telegram API call failed: %s", method)
        return {}


async def _answer_callback(callback_id: str, text: str = "") -> None:
    """Dismiss the loading spinner on an inline button press."""
    await _tg_post("answerCallbackQuery", {"callback_query_id": callback_id, "text": text})


async def _send_contact_request(chat_id: str, text: str) -> None:
    """Send a message with a 'Share phone number' keyboard button."""
    await _tg_post("sendMessage", {
        "chat_id": chat_id,
        "text": text,
        "reply_markup": {
            "keyboard": [[{"text": "📱 Поделиться номером телефона", "request_contact": True}]],
            "resize_keyboard": True,
            "one_time_keyboard": True,
        },
    })


async def _send_inline_menu(
    chat_id: str,
    text: str,
    buttons: list[list[dict[str, Any]]],
    parse_mode: str = "HTML",
    message_id: int | None = None,
) -> int | None:
    """Send (or edit) a message with an inline keyboard. Returns message_id."""
    payload: dict[str, Any] = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode,
        "reply_markup": {"inline_keyboard": buttons},
        "disable_web_page_preview": True,
    }
    if message_id:
        payload["message_id"] = message_id
        result = await _tg_post("editMessageText", payload)
    else:
        result = await _tg_post("sendMessage", payload)

    if result.get("ok"):
        return result.get("result", {}).get("message_id")
    return None


async def _send_message(
    chat_id: str,
    text: str,
    parse_mode: str = "HTML",
    url_button: tuple[str, str] | None = None,
    remove_keyboard: bool = True,
) -> None:
    """Send a plain message, optionally with a single URL button."""
    payload: dict[str, Any] = {
        "chat_id": chat_id,
        "text": text,
        "disable_web_page_preview": True,
    }
    if parse_mode:
        payload["parse_mode"] = parse_mode
    if url_button:
        label, url = url_button
        payload["reply_markup"] = {"inline_keyboard": [[{"text": label, "url": url}]]}
    elif remove_keyboard:
        payload["reply_markup"] = {"remove_keyboard": True}

    await _tg_post("sendMessage", payload)


# ---------------------------------------------------------------------------
# Menu builders
# ---------------------------------------------------------------------------

def _main_menu_text(name: str | None = None) -> str:
    greeting = f"👋 Привет, <b>{name}</b>!" if name else "👋 Привет!"
    return (
        f"{greeting}\n\n"
        f"🚗 <b>TajCar.tj</b> — покупка и продажа авто по всему Таджикистану.\n\n"
        f"Чем помочь? Выберите действие ниже 👇"
    )


def _main_menu_buttons() -> list[list[dict[str, Any]]]:
    return [
        [
            {"text": "📋 Мои объявления", "callback_data": "listings_p_1"},
            {"text": "👤 Мой статус", "callback_data": "status"},
        ],
        [
            {"text": "➕ Новое объявление", "url": f"{SITE_URL}/post"},
            {"text": "💬 Поддержка", "callback_data": "support"},
        ],
        [
            {"text": "❓ Помощь / FAQ", "callback_data": "help"},
            {"text": "🌐 Открыть сайт", "url": SITE_URL},
        ],
    ]


# ---------------------------------------------------------------------------
# Webhook entry point
# ---------------------------------------------------------------------------

@router.post("/webhook")
async def telegram_webhook(request: Request) -> dict[str, str]:
    """Receive updates from Telegram."""
    webhook_secret = settings.telegram_webhook_secret
    if not webhook_secret:
        logger.error("TELEGRAM_WEBHOOK_SECRET is not set. Rejecting webhook request.")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Webhook not configured")
    header_secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
    if not secrets.compare_digest(header_secret, webhook_secret):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid secret")

    try:
        update: dict[str, Any] = await request.json()
    except Exception:
        return {"ok": "true"}

    # ── Callback query (inline button press) ─────────────────────────────────
    callback = update.get("callback_query")
    if callback:
        await _handle_callback(callback)
        return {"ok": "true"}

    message = update.get("message") or update.get("edited_message")
    if not message:
        return {"ok": "true"}

    chat_id: str = str(message.get("chat", {}).get("id", ""))
    from_user: dict[str, Any] = message.get("from", {})
    first_name: str = from_user.get("first_name", "")
    last_name: str = from_user.get("last_name", "")
    telegram_name = (first_name + (" " + last_name if last_name else "")).strip() or None

    # ── Contact shared by user ────────────────────────────────────────────────
    contact: dict[str, Any] | None = message.get("contact")
    if contact:
        await _handle_contact(chat_id, contact)
        return {"ok": "true"}

    text: str = message.get("text", "")
    if not text:
        return {"ok": "true"}

    # ── Admin reply relay ─────────────────────────────────────────────────────
    support_chat_id = settings.support_telegram_chat_id
    if support_chat_id and chat_id == support_chat_id:
        reply_to = message.get("reply_to_message")
        if reply_to:
            await _handle_admin_reply(reply_to.get("message_id"), text)
        return {"ok": "true"}

    # ── Support state: user is sending a support message ─────────────────────
    if chat_id in _support_state and not text.startswith("/"):
        del _support_state[chat_id]
        await _handle_support_message(chat_id, text, telegram_name)
        return {"ok": "true"}

    # ── Named commands ────────────────────────────────────────────────────────
    if text.startswith("/help"):
        await _send_help(chat_id)
        return {"ok": "true"}

    if text.startswith("/mylistings"):
        await _handle_listings_page(chat_id, 1)
        return {"ok": "true"}

    if text.startswith("/status"):
        await _handle_status_send(chat_id)
        return {"ok": "true"}

    if not text.startswith("/start"):
        # Any unrecognized text → show main menu
        await _send_inline_menu(
            chat_id,
            _main_menu_text(telegram_name),
            _main_menu_buttons(),
        )
        return {"ok": "true"}

    # ── /start ────────────────────────────────────────────────────────────────
    parts = text.strip().split(maxsplit=1)
    token_str = parts[1] if len(parts) > 1 else ""

    if not token_str:
        await _send_inline_menu(
            chat_id,
            _main_menu_text(telegram_name),
            _main_menu_buttons(),
        )
        return {"ok": "true"}

    await _handle_start(chat_id, token_str, telegram_name)
    return {"ok": "true"}


# ---------------------------------------------------------------------------
# Callback query handler
# ---------------------------------------------------------------------------

async def _handle_callback(callback: dict[str, Any]) -> None:
    callback_id: str = callback.get("id", "")
    chat_id: str = str(callback.get("from", {}).get("id", ""))
    data: str = callback.get("data", "")
    message: dict[str, Any] = callback.get("message", {})
    message_id: int | None = message.get("message_id")
    first_name: str = callback.get("from", {}).get("first_name", "")

    await _answer_callback(callback_id)

    if data == "main":
        await _send_inline_menu(
            chat_id,
            _main_menu_text(first_name or None),
            _main_menu_buttons(),
            message_id=message_id,
        )

    elif data.startswith("listings_p_"):
        try:
            page = int(data.split("_")[-1])
        except ValueError:
            page = 1
        await _handle_listings_page(chat_id, page, message_id=message_id)

    elif data == "status":
        await _handle_status_send(chat_id, message_id=message_id)

    elif data == "help":
        await _send_help(chat_id, message_id=message_id)

    elif data == "support":
        _support_state[chat_id] = True
        support_text = (
            "💬 <b>Поддержка TajCar.tj</b>\n\n"
            "Напишите ваш вопрос или проблему — мы ответим в ближайшее время.\n\n"
            "<i>Просто отправьте следующее сообщение.</i>"
        )
        if message_id:
            await _send_inline_menu(
                chat_id,
                support_text,
                [[{"text": "◀ Назад", "callback_data": "main"}]],
                message_id=message_id,
            )
        else:
            await _send_message(chat_id, support_text)


# ---------------------------------------------------------------------------
# Feature handlers
# ---------------------------------------------------------------------------

async def _handle_listings_page(
    chat_id: str,
    page: int,
    message_id: int | None = None,
) -> None:
    """Show the user's listings with pagination."""
    from app.models import Listing, ListingStatus

    STATUS_LABELS: dict[str, str] = {
        "active":   "✅ Активно",
        "pending":  "⏳ На модерации",
        "rejected": "❌ Отклонено",
        "inactive": "⏸ Неактивно",
    }

    def _query() -> dict[str, Any]:
        db: Session = SessionLocal()
        try:
            user = db.query(User).filter(
                User.telegram_chat_id == chat_id,
                User.is_deleted == False,
            ).first()
            if not user:
                return {"status": "not_linked"}
            total = (
                db.query(Listing)
                .filter(Listing.user_id == user.id, Listing.is_deleted == False)
                .count()
            )
            listings = (
                db.query(Listing)
                .filter(Listing.user_id == user.id, Listing.is_deleted == False)
                .order_by(Listing.created_at.desc())
                .offset((page - 1) * _LISTINGS_PER_PAGE)
                .limit(_LISTINGS_PER_PAGE)
                .all()
            )
            items = []
            for lst in listings:
                label = f"{lst.brand or ''} {lst.model or ''} {lst.year or ''}".strip() or "—"
                price = f"{lst.price:,.0f} $" if lst.price else "—"
                st = lst.status.value if lst.status else "inactive"
                items.append({
                    "id": lst.id,
                    "label": label,
                    "price": price,
                    "status": STATUS_LABELS.get(st, st),
                    "url": f"{SITE_URL}/car/{lst.id}",
                })
            return {"status": "ok", "items": items, "total": total}
        finally:
            db.close()

    try:
        result = await asyncio.to_thread(_query)
    except Exception:
        logger.exception("Error in _handle_listings_page")
        await _send_message(chat_id, "Произошла ошибка. Попробуйте позже.")
        return

    if result["status"] == "not_linked":
        await _send_inline_menu(
            chat_id,
            "❗ Ваш Telegram не привязан к аккаунту TajCar.tj.\n\nЗарегистрируйтесь на сайте через Telegram.",
            [
                [{"text": "🌐 Открыть TajCar.tj", "url": SITE_URL}],
                [{"text": "◀ Назад", "callback_data": "main"}],
            ],
            message_id=message_id,
        )
        return

    items = result["items"]
    total = result["total"]
    total_pages = max(1, (total + _LISTINGS_PER_PAGE - 1) // _LISTINGS_PER_PAGE)

    if not items:
        await _send_inline_menu(
            chat_id,
            "📋 <b>Мои объявления</b>\n\nУ вас пока нет объявлений.",
            [
                [{"text": "➕ Разместить объявление", "url": f"{SITE_URL}/post"}],
                [{"text": "◀ Назад", "callback_data": "main"}],
            ],
            message_id=message_id,
        )
        return

    lines = [f"📋 <b>Мои объявления</b>  <i>({page}/{total_pages})</i>\n"]
    for i, item in enumerate(items, start=(page - 1) * _LISTINGS_PER_PAGE + 1):
        lines.append(f"{i}. <b>{item['label']}</b> — {item['price']}")
        lines.append(f"   {item['status']}")

    text = "\n".join(lines)

    # Per-listing URL buttons
    listing_buttons: list[list[dict[str, Any]]] = [
        [{"text": f"🔗 {item['label']}", "url": item["url"]}]
        for item in items
    ]

    # Pagination row
    nav_row: list[dict[str, Any]] = []
    if page > 1:
        nav_row.append({"text": "◀", "callback_data": f"listings_p_{page - 1}"})
    nav_row.append({"text": f"{page}/{total_pages}", "callback_data": "listings_p_1"})
    if page < total_pages:
        nav_row.append({"text": "▶", "callback_data": f"listings_p_{page + 1}"})

    buttons: list[list[dict[str, Any]]] = listing_buttons + [nav_row, [
        {"text": "➕ Новое объявление", "url": f"{SITE_URL}/post"},
        {"text": "◀ Назад", "callback_data": "main"},
    ]]

    await _send_inline_menu(chat_id, text, buttons, message_id=message_id)


async def _handle_status_send(chat_id: str, message_id: int | None = None) -> None:
    """Show account status with inline buttons."""
    def _query() -> dict[str, Any]:
        db: Session = SessionLocal()
        try:
            user = db.query(User).filter(
                User.telegram_chat_id == chat_id,
                User.is_deleted == False,
            ).first()
            if not user:
                return {"status": "not_linked"}
            from app.models import Listing, ListingStatus
            active_count = db.query(Listing).filter(
                Listing.user_id == user.id,
                Listing.status == ListingStatus.active,
                Listing.is_deleted == False,
            ).count()
            pending_count = db.query(Listing).filter(
                Listing.user_id == user.id,
                Listing.status == ListingStatus.pending,
                Listing.is_deleted == False,
            ).count()
            return {
                "status": "ok",
                "name": user.name or "—",
                "phone": user.phone or "—",
                "email": user.email or "—",
                "role": user.role.value,
                "is_banned": user.is_banned,
                "phone_verified": user.phone_verified,
                "email_verified": user.email_verified,
                "active_listings": active_count,
                "pending_listings": pending_count,
                "member_since": user.created_at.strftime("%d.%m.%Y") if user.created_at else "—",
            }
        finally:
            db.close()

    try:
        info = await asyncio.to_thread(_query)
    except Exception:
        logger.exception("Error in _handle_status_send")
        await _send_message(chat_id, "Произошла ошибка. Попробуйте позже.")
        return

    if info["status"] == "not_linked":
        await _send_inline_menu(
            chat_id,
            "❗ Ваш Telegram не привязан к аккаунту TajCar.tj.",
            [
                [{"text": "🌐 Открыть TajCar.tj", "url": SITE_URL}],
                [{"text": "◀ Назад", "callback_data": "main"}],
            ],
            message_id=message_id,
        )
        return

    ban_line = "\n⛔ <b>Аккаунт заблокирован</b>" if info["is_banned"] else ""
    phone_ok = "✅" if info["phone_verified"] else "❌"
    email_ok = "✅" if info["email_verified"] else "❌"

    ROLE_LABELS = {
        "user":      "Пользователь",
        "dealer":    "Дилер",
        "admin":     "Администратор",
        "moderator": "Модератор",
        "manager":   "Менеджер",
        "support":   "Поддержка",
    }

    text = (
        f"👤 <b>Статус аккаунта</b>{ban_line}\n\n"
        f"<b>Имя:</b> {info['name']}\n"
        f"<b>Телефон:</b> {info['phone']}  {phone_ok}\n"
        f"<b>Email:</b> {info['email']}  {email_ok}\n"
        f"<b>Роль:</b> {ROLE_LABELS.get(info['role'], info['role'])}\n"
        f"<b>На сайте с:</b> {info['member_since']}\n\n"
        f"📋 Активных объявлений: <b>{info['active_listings']}</b>\n"
        f"⏳ На модерации: <b>{info['pending_listings']}</b>\n\n"
        f"🔗 Telegram привязан ✅"
    )

    buttons: list[list[dict[str, Any]]] = [
        [
            {"text": "📋 Мои объявления", "callback_data": "listings_p_1"},
            {"text": "🌐 Профиль", "url": f"{SITE_URL}/dashboard"},
        ],
        [{"text": "◀ Назад", "callback_data": "main"}],
    ]

    await _send_inline_menu(chat_id, text, buttons, message_id=message_id)


async def _send_help(chat_id: str, message_id: int | None = None) -> None:
    text = (
        "❓ <b>Помощь / FAQ</b>\n\n"
        "<b>Как разместить объявление?</b>\n"
        "Зайдите на сайт → нажмите «Разместить» → заполните форму. Объявление появится после модерации (обычно до 2 часов).\n\n"
        "<b>Почему объявление на модерации?</b>\n"
        "Мы проверяем все объявления вручную. Если объявление отклонено — вы получите уведомление с причиной.\n\n"
        "<b>Как связаться с покупателем?</b>\n"
        "Нажмите «Написать» на странице объявления — откроется чат.\n\n"
        "<b>Как изменить объявление?</b>\n"
        "Зайдите в «Профиль» → «Мои объявления» → «Редактировать».\n\n"
        "<b>Не приходит OTP-код?</b>\n"
        "Убедитесь, что номер телефона введён правильно. Если проблема не исчезает — обратитесь в поддержку.\n\n"
        "<b>Команды бота:</b>\n"
        "/start — Главное меню\n"
        "/mylistings — Мои объявления\n"
        "/status — Статус аккаунта\n"
        "/help — Эта справка"
    )
    buttons: list[list[dict[str, Any]]] = [
        [{"text": "💬 Написать в поддержку", "callback_data": "support"}],
        [{"text": "◀ Назад", "callback_data": "main"}],
    ]
    await _send_inline_menu(chat_id, text, buttons, message_id=message_id)


# ---------------------------------------------------------------------------
# Support relay
# ---------------------------------------------------------------------------

async def _handle_support_message(
    chat_id: str,
    text: str,
    telegram_name: str | None,
) -> None:
    """Forward a user's support message to the admin chat and confirm receipt."""
    support_chat_id = settings.support_telegram_chat_id

    # Enrich with DB info
    def _get_user_info() -> dict[str, str]:
        db: Session = SessionLocal()
        try:
            user = db.query(User).filter(
                User.telegram_chat_id == chat_id,
                User.is_deleted == False,
            ).first()
            if user:
                return {
                    "name": user.name or telegram_name or "—",
                    "phone": user.phone or "—",
                    "user_id": str(user.id),
                }
            return {"name": telegram_name or "—", "phone": "—", "user_id": "—"}
        finally:
            db.close()

    try:
        user_info = await asyncio.to_thread(_get_user_info)
    except Exception:
        user_info = {"name": telegram_name or "—", "phone": "—", "user_id": "—"}

    # Confirm receipt to user immediately
    await _send_inline_menu(
        chat_id,
        (
            "✅ <b>Сообщение отправлено</b>\n\n"
            "Ваш вопрос получен. Мы ответим в ближайшее время.\n\n"
            "<i>Ответ придёт прямо в этот чат.</i>"
        ),
        [[{"text": "◀ Назад в меню", "callback_data": "main"}]],
    )

    if not support_chat_id:
        logger.warning("[SUPPORT] No SUPPORT_TELEGRAM_CHAT_ID set. Message from %s: %s", chat_id, text)
        return

    # Forward to admin with user header
    admin_text = (
        f"📩 <b>Обращение в поддержку</b>\n\n"
        f"<b>От:</b> {user_info['name']}\n"
        f"<b>Телефон:</b> {user_info['phone']}\n"
        f"<b>Telegram ID:</b> <code>{chat_id}</code>\n"
        f"<b>User ID:</b> {user_info['user_id']}\n\n"
        f"<b>Сообщение:</b>\n{text}\n\n"
        f"<i>Ответьте на это сообщение — ответ будет переслан пользователю.</i>"
    )

    result = await _tg_post("sendMessage", {
        "chat_id": support_chat_id,
        "text": admin_text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    })

    forwarded_id = result.get("result", {}).get("message_id")
    if forwarded_id:
        _support_reply_map[forwarded_id] = chat_id
        # Keep the map bounded — remove oldest entries if over 500
        if len(_support_reply_map) > 500:
            oldest = next(iter(_support_reply_map))
            del _support_reply_map[oldest]


async def _handle_admin_reply(reply_to_message_id: int | None, text: str) -> None:
    """Relay admin's reply to the original user."""
    if not reply_to_message_id:
        return
    user_chat_id = _support_reply_map.get(reply_to_message_id)
    if not user_chat_id:
        logger.info("[SUPPORT] Admin replied to unknown message_id=%s", reply_to_message_id)
        return

    await _send_inline_menu(
        user_chat_id,
        f"💬 <b>Ответ поддержки TajCar.tj:</b>\n\n{text}",
        [[{"text": "◀ Меню", "callback_data": "main"}]],
    )


# ---------------------------------------------------------------------------
# Phone verification flow (unchanged logic, improved messages)
# ---------------------------------------------------------------------------

def _handle_start_sync(chat_id: str, token_str: str, telegram_name: str | None) -> bool:
    db: Session = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        tg_token = (
            db.query(TelegramToken)
            .filter(
                TelegramToken.token == token_str,
                TelegramToken.is_used == False,
                TelegramToken.expires_at > now,
            )
            .first()
        )
        if not tg_token:
            return False
        tg_token.telegram_chat_id = chat_id
        tg_token.telegram_name = telegram_name
        db.commit()
        return True
    finally:
        db.close()


async def _handle_start(chat_id: str, token_str: str, telegram_name: str | None) -> None:
    try:
        token_valid = await asyncio.to_thread(_handle_start_sync, chat_id, token_str, telegram_name)
    except Exception:
        logger.exception("Error in _handle_start")
        await _send_message(chat_id, "Произошла ошибка. Попробуйте позже.")
        return

    if not token_valid:
        await _send_inline_menu(
            chat_id,
            "❗ Ссылка недействительна или истекла.\n\nВернитесь на сайт и запросите новую ссылку.",
            [[{"text": "🌐 Открыть TajCar.tj", "url": SITE_URL}]],
        )
        return

    await _send_contact_request(
        chat_id,
        "📱 Нажмите кнопку ниже, чтобы подтвердить ваш номер телефона и получить код входа.",
    )


def _handle_contact_sync(chat_id: str, shared_phone: str) -> dict[str, Any]:
    db: Session = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        tg_token = (
            db.query(TelegramToken)
            .filter(
                TelegramToken.telegram_chat_id == chat_id,
                TelegramToken.is_used == False,
                TelegramToken.expires_at > now,
            )
            .order_by(TelegramToken.created_at.desc())
            .first()
        )
        if not tg_token:
            return {"status": "no_token"}

        token_phone = _normalize_phone(tg_token.phone)
        if shared_phone != token_phone:
            tg_token.is_used = True
            db.commit()
            return {"status": "phone_mismatch"}

        existing_owner = (
            db.query(User)
            .filter(User.telegram_chat_id == chat_id, User.phone != token_phone)
            .first()
        )
        if existing_owner:
            tg_token.is_used = True
            db.commit()
            return {"status": "already_linked"}

        code = str(secrets.randbelow(900000) + 100000)
        expires_at = now + timedelta(minutes=10)

        db.query(OtpCode).filter(
            OtpCode.phone == tg_token.phone,
            OtpCode.purpose == "phone_auth",
            OtpCode.is_used == False,
        ).update({"is_used": True})

        db.add(OtpCode(phone=tg_token.phone, code=code, expires_at=expires_at))
        tg_token.is_used = True

        user = db.query(User).filter(User.phone == tg_token.phone).first()
        if user and not user.telegram_chat_id:
            user.telegram_chat_id = chat_id

        db.commit()
        return {"status": "otp_sent", "code": code}
    finally:
        db.close()


async def _handle_contact(chat_id: str, contact: dict[str, Any]) -> None:
    raw_phone: str = contact.get("phone_number", "")
    if not raw_phone:
        await _send_message(chat_id, "Не удалось получить номер. Попробуйте ещё раз.")
        return

    shared_phone = _normalize_phone(raw_phone)

    try:
        result = await asyncio.to_thread(_handle_contact_sync, chat_id, shared_phone)
    except Exception:
        logger.exception("Error in _handle_contact")
        await _send_message(chat_id, "Произошла ошибка. Попробуйте позже.")
        return

    status_val = result.get("status")

    if status_val == "no_token":
        await _send_inline_menu(
            chat_id,
            "⏱ Сессия истекла. Вернитесь на сайт и начните заново.",
            [[{"text": "🌐 Открыть TajCar.tj", "url": SITE_URL}]],
        )
        return

    if status_val == "phone_mismatch":
        await _send_inline_menu(
            chat_id,
            (
                "❗ <b>Номер не совпадает</b>\n\n"
                "Номер, которым вы поделились, не совпадает с тем, что вы ввели на сайте.\n\n"
                "Введите на сайте тот же номер, что привязан к Telegram, или используйте другой способ входа."
            ),
            [[{"text": "🌐 Открыть TajCar.tj", "url": SITE_URL}]],
        )
        return

    if status_val == "already_linked":
        await _send_inline_menu(
            chat_id,
            (
                "❗ Этот Telegram-аккаунт уже привязан к другому номеру.\n\n"
                "Войдите через тот номер или обратитесь в поддержку."
            ),
            [
                [{"text": "🌐 Открыть TajCar.tj", "url": SITE_URL}],
                [{"text": "💬 Поддержка", "callback_data": "support"}],
            ],
        )
        return

    code = result["code"]
    spaced = "  ".join(code)
    await _send_message(
        chat_id,
        (
            f"✅ <b>Номер подтверждён!</b>\n\n"
            f"Ваш код входа на TajCar.tj:\n\n"
            f"<code>{code}</code>\n\n"
            f"<b>{spaced}</b>\n\n"
            f"Нажмите на код, чтобы скопировать.\n"
            f"Введите его на сайте — код действует <b>10 минут</b>.\n"
            f"Никому не передавайте этот код."
        ),
        parse_mode="HTML",
        url_button=("🌐 Открыть TajCar.tj", f"{SITE_URL}/auth/register"),
    )


# ---------------------------------------------------------------------------
# Outbound notifications (called from other routers)
# ---------------------------------------------------------------------------

async def send_welcome_message(chat_id: str, name: str | None, language: str = "ru") -> None:
    """Called by verify-otp after successful login."""
    is_tj = language == "tj"

    if is_tj:
        greeting = f"Хуш омадед{', ' + name if name else ''}!"
        body = (
            f"<b>{greeting}</b>\n\n"
            f"Шумо бомуваффақият ба TajCar.tj пайваст шудед.\n\n"
            f"Тавассути ин бот шумо огоҳиҳо мегиред:\n"
            f"• Вазъияти эълонҳо\n"
            f"• Паёмҳои нав аз харидорон\n"
            f"• Навсозиҳои муҳими аккаунт\n\n"
            f"Аккаунти шумо фаъол аст ✅"
        )
        btn_label = "Кушодани TajCar.tj"
    else:
        greeting = f"Добро пожаловать{', ' + name if name else ''}!"
        body = (
            f"<b>{greeting}</b>\n\n"
            f"Вы успешно подключили Telegram к TajCar.tj.\n\n"
            f"Через этот бот вы будете получать уведомления о:\n"
            f"• Статусе ваших объявлений\n"
            f"• Новых сообщениях от покупателей\n"
            f"• Важных обновлениях аккаунта\n\n"
            f"Ваш аккаунт активен ✅"
        )
        btn_label = "Открыть TajCar.tj"

    await _send_inline_menu(
        chat_id,
        body,
        [
            [
                {"text": btn_label, "url": SITE_URL},
                {"text": "📋 Мои объявления", "callback_data": "listings_p_1"},
            ],
            [{"text": "◀ Меню", "callback_data": "main"}],
        ],
    )


async def send_listing_status_notification(
    chat_id: str,
    car_name: str,
    new_status: str,
    reason: str | None = None,
    listing_url: str | None = None,
) -> None:
    """Called when a listing is approved or rejected."""
    if new_status == "active":
        text = (
            f"✅ <b>Объявление опубликовано!</b>\n\n"
            f"<b>{car_name}</b> прошло модерацию и теперь видно покупателям."
        )
        buttons: list[list[dict[str, Any]]] = [[
            {"text": "🔗 Открыть объявление", "url": listing_url or SITE_URL},
            {"text": "◀ Меню", "callback_data": "main"},
        ]]
    else:
        reason_line = f"\n\n<b>Причина:</b> {reason}" if reason else ""
        text = (
            f"❌ <b>Объявление отклонено</b>\n\n"
            f"<b>{car_name}</b> не прошло модерацию.{reason_line}\n\n"
            f"Исправьте замечания и отправьте повторно."
        )
        buttons = [[
            {"text": "✏️ Редактировать", "url": listing_url or f"{SITE_URL}/dashboard"},
            {"text": "◀ Меню", "callback_data": "main"},
        ]]

    await _send_inline_menu(chat_id, text, buttons)


async def send_new_message_notification(
    chat_id: str,
    sender_name: str | None,
    preview: str | None,
    chat_url: str,
) -> None:
    """Called when a user receives a new chat message."""
    sender = sender_name or "Пользователь"
    preview_line = f"\n\n<i>«{preview[:120]}»</i>" if preview else ""
    text = f"💬 <b>Новое сообщение от {sender}</b>{preview_line}"
    await _send_inline_menu(
        chat_id,
        text,
        [[
            {"text": "💬 Ответить", "url": chat_url},
            {"text": "◀ Меню", "callback_data": "main"},
        ]],
    )


# ---------------------------------------------------------------------------
# Telegram Mini App / Web App login
# ---------------------------------------------------------------------------

class WebAppLoginPayload(BaseModel):
    init_data: str


def _validate_telegram_init_data(init_data: str, bot_token: str) -> dict | None:
    """Validate Telegram WebApp initData HMAC signature."""
    params = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = params.pop("hash", None)
    if not received_hash:
        return None

    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(params.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    computed = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(computed, received_hash):
        return None

    try:
        auth_date = int(params.get("auth_date", "0"))
    except (ValueError, TypeError):
        return None
    if time.time() - auth_date > 600:
        return None

    user_str = params.get("user", "{}")
    try:
        return json.loads(user_str)
    except (json.JSONDecodeError, ValueError):
        return None


@router.post("/webapp-login")
async def webapp_login(payload: WebAppLoginPayload, response: Response) -> dict:
    """Authenticate a user via Telegram Mini App initData."""
    from app.auth import create_access_token

    bot_token = settings.telegram_bot_token
    if not bot_token:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Telegram bot not configured")

    tg_user = _validate_telegram_init_data(payload.init_data, bot_token)
    if tg_user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Telegram initData signature")

    tg_id = tg_user.get("id")
    if not tg_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Telegram user ID missing from initData")

    chat_id_str = str(tg_id)
    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(
            User.telegram_chat_id == chat_id_str,
            User.is_deleted == False,
        ).first()

        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not linked")
        if user.is_banned:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is suspended")

        token = create_access_token(
            {"sub": str(user.id), "role": user.role.value},
            token_version=user.token_version,
        )
        is_prod = settings.environment == "production"
        response.set_cookie(
            key="token",
            value=token,
            httponly=True,
            secure=is_prod,
            samesite="none" if is_prod else "lax",
            max_age=60 * 60 * 24 * 7,
            path="/",
        )
        return {"success": True, "data": {"token": token}, "message": "Logged in via Telegram"}
    finally:
        db.close()
