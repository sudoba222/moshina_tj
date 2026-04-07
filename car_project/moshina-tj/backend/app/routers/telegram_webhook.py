"""Telegram bot webhook handler.

Register the webhook once:
  GET https://api.telegram.org/bot<TOKEN>/setWebhook
      ?url=https://tajcar-api.onrender.com/telegram/webhook
      &secret_token=<TELEGRAM_WEBHOOK_SECRET>

No separate process needed — Telegram POSTs updates to this endpoint.

Phone verification flow:
  1. User clicks deep link → /start <token> → bot asks to share phone
  2. User taps "Share phone" button → bot receives contact
  3. Bot compares contact phone with the phone stored in TelegramToken
  4. Match → generate and send OTP
  5. Mismatch → reject with clear error
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

SITE_URL = settings.frontend_url  # configured via FRONTEND_URL env var — never trust unvalidated env vars


def _normalize_phone(phone: str) -> str:
    """Normalize to +XXXXXXXXXXX for comparison."""
    digits = "".join(c for c in phone if c.isdigit())
    return "+" + digits


@router.post("/webhook")
async def telegram_webhook(request: Request) -> dict[str, str]:
    """Receive updates from Telegram."""
    webhook_secret = settings.telegram_webhook_secret
    if not webhook_secret:
        # Webhook secret is mandatory — reject all requests when not configured
        logger.error(
            "TELEGRAM_WEBHOOK_SECRET is not set. "
            "Rejecting webhook request to prevent unauthenticated Telegram updates."
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Webhook not configured")
    header_secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
    if not secrets.compare_digest(header_secret, webhook_secret):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid secret")

    try:
        update: dict[str, Any] = await request.json()
    except Exception:
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

    # ── Text message ──────────────────────────────────────────────────────────
    text: str = message.get("text", "")

    # ── Named commands ────────────────────────────────────────────────────────
    if text.startswith("/help"):
        await _send_message(
            chat_id,
            "TajCar.tj — бот для уведомлений и верификации\n\n"
            "Доступные команды:\n"
            "/start — Главная / верификация номера\n"
            "/mylistings — Мои объявления\n"
            "/status — Статус аккаунта\n"
            "/help — Эта справка\n\n"
            f"Сайт: {SITE_URL}",
            url_button=("Открыть TajCar.tj", SITE_URL),
        )
        return {"ok": "true"}

    if text.startswith("/mylistings"):
        await _handle_mylistings(chat_id)
        return {"ok": "true"}

    if text.startswith("/status"):
        await _handle_status(chat_id)
        return {"ok": "true"}

    if not text.startswith("/start"):
        await _send_message(chat_id, (
            "Привет! Я бот TajCar.tj\n\n"
            f"Сайт: {SITE_URL}\n\n"
            "Откройте сайт → Регистрация → «Войти через Telegram», чтобы начать.\n\n"
            "Введите /help для списка команд."
        ), url_button=("Открыть TajCar.tj", SITE_URL))
        return {"ok": "true"}

    parts = text.strip().split(maxsplit=1)
    token_str = parts[1] if len(parts) > 1 else ""

    if not token_str:
        await _send_message(chat_id, (
            "Привет! Я бот TajCar.tj\n\n"
            f"Сайт: {SITE_URL}\n\n"
            "Откройте сайт → Регистрация → «Войти через Telegram», чтобы начать.\n\n"
            "Введите /help для списка команд."
        ), url_button=("Открыть TajCar.tj", SITE_URL))
        return {"ok": "true"}

    await _handle_start(chat_id, token_str, telegram_name)
    return {"ok": "true"}


async def _handle_mylistings(chat_id: str) -> None:
    """Return the user's active listings."""
    from app.models import Listing, ListingStatus

    def _query() -> str:
        db: Session = SessionLocal()
        try:
            user = db.query(User).filter(User.telegram_chat_id == chat_id, User.is_deleted == False).first()
            if not user:
                return "not_linked"
            listings = (
                db.query(Listing)
                .filter(Listing.user_id == user.id, Listing.status == ListingStatus.active, Listing.is_deleted == False)
                .order_by(Listing.created_at.desc())
                .limit(10)
                .all()
            )
            if not listings:
                return "empty"
            lines = ["Ваши активные объявления:\n"]
            for i, lst in enumerate(listings, 1):
                price = f"{lst.price:,.0f} $" if lst.price else "—"
                car_label = f"{lst.brand} {lst.model} {lst.year}" if lst.brand else "—"
                lines.append(f"{i}. {car_label} — {price}")
                lines.append(f"   {SITE_URL}/car/{lst.id}")
            return "\n".join(lines)
        finally:
            db.close()

    try:
        result = await asyncio.to_thread(_query)
    except Exception:
        logger.exception("Error in _handle_mylistings")
        await _send_message(chat_id, "Произошла ошибка. Попробуйте позже.")
        return

    if result == "not_linked":
        await _send_message(
            chat_id,
            "Ваш Telegram не привязан к аккаунту TajCar.tj.\n\n"
            "Зарегистрируйтесь на сайте через Telegram.",
            url_button=("Открыть TajCar.tj", SITE_URL),
        )
    elif result == "empty":
        await _send_message(
            chat_id,
            "У вас пока нет активных объявлений.\n\nРазместите первое объявление на сайте!",
            url_button=("Разместить объявление", f"{SITE_URL}/post"),
        )
    else:
        await _send_message(chat_id, result, url_button=("Все объявления", f"{SITE_URL}/dashboard"))


async def _handle_status(chat_id: str) -> None:
    """Return the user's account status."""
    def _query() -> dict:
        db: Session = SessionLocal()
        try:
            user = db.query(User).filter(User.telegram_chat_id == chat_id, User.is_deleted == False).first()
            if not user:
                return {"status": "not_linked"}
            return {
                "status": "ok",
                "name": user.name or "—",
                "phone": user.phone or "—",
                "role": user.role.value,
                "is_banned": user.is_banned,
                "is_verified": user.phone_verified or user.email_verified,
            }
        finally:
            db.close()

    try:
        info = await asyncio.to_thread(_query)
    except Exception:
        logger.exception("Error in _handle_status")
        await _send_message(chat_id, "Произошла ошибка. Попробуйте позже.")
        return

    if info["status"] == "not_linked":
        await _send_message(
            chat_id,
            "Ваш Telegram не привязан к аккаунту TajCar.tj.\n\n"
            "Зарегистрируйтесь на сайте через Telegram.",
            url_button=("Открыть TajCar.tj", SITE_URL),
        )
        return

    banned_str = " (заблокирован)" if info["is_banned"] else ""
    text = (
        f"Статус аккаунта TajCar.tj\n\n"
        f"Имя: {info['name']}\n"
        f"Телефон: {info['phone']}\n"
        f"Роль: {info['role']}{banned_str}\n\n"
        f"Telegram привязан"
    )
    await _send_message(chat_id, text, url_button=("Открыть профиль", f"{SITE_URL}/dashboard"))


def _handle_start_sync(chat_id: str, token_str: str, telegram_name: str | None) -> bool:
    """Synchronous DB work for _handle_start. Returns True if token is valid."""
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

        # Save chat_id and name on token — marks it as "waiting for contact"
        tg_token.telegram_chat_id = chat_id
        tg_token.telegram_name = telegram_name
        db.commit()
        return True
    finally:
        db.close()


async def _handle_start(chat_id: str, token_str: str, telegram_name: str | None) -> None:
    """Validate the deep-link token and ask the user to share their phone."""
    try:
        token_valid = await asyncio.to_thread(_handle_start_sync, chat_id, token_str, telegram_name)
    except Exception:
        logger.exception("Error in _handle_start")
        await _send_message(chat_id, "Произошла ошибка. Попробуйте позже.")
        return

    if not token_valid:
        await _send_message(chat_id, (
            "Ссылка недействительна или истекла.\n"
            f"Вернитесь на сайт и запросите новую ссылку: {SITE_URL}"
        ), url_button=("Открыть TajCar.tj", SITE_URL))
        return

    # Ask user to share their phone number
    await _send_contact_request(
        chat_id,
        f"Вы вводили номер на сайте.\n\nНажмите кнопку ниже, чтобы подтвердить ваш номер телефона и получить код подтверждения.",
    )


def _handle_contact_sync(chat_id: str, shared_phone: str) -> dict[str, Any]:
    """Synchronous DB work for _handle_contact.

    Returns a result dict with a 'status' key:
      'no_token'      — session expired
      'phone_mismatch'— shared phone doesn't match token phone
      'already_linked'— Telegram already linked to a different number
      'otp_sent'      — OTP generated; 'code' key contains the OTP string
    """
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

        # Check if this Telegram account is already linked to a DIFFERENT phone
        existing_owner = (
            db.query(User)
            .filter(
                User.telegram_chat_id == chat_id,
                User.phone != token_phone,
            )
            .first()
        )
        if existing_owner:
            tg_token.is_used = True
            db.commit()
            return {"status": "already_linked"}

        # Phone verified — generate OTP
        code = str(secrets.randbelow(900000) + 100000)
        expires_at = now + timedelta(minutes=10)

        # Invalidate old unused phone_auth OTPs for this phone only
        db.query(OtpCode).filter(
            OtpCode.phone == tg_token.phone,
            OtpCode.purpose == "phone_auth",
            OtpCode.is_used == False,
        ).update({"is_used": True})

        db.add(OtpCode(phone=tg_token.phone, code=code, expires_at=expires_at))

        tg_token.is_used = True

        # Save chat_id on existing user if they don't have it yet
        user = (
            db.query(User)
            .filter(User.phone == tg_token.phone)
            .first()
        )
        if user and not user.telegram_chat_id:
            user.telegram_chat_id = chat_id

        db.commit()
        return {"status": "otp_sent", "code": code}
    finally:
        db.close()


async def _handle_contact(chat_id: str, contact: dict[str, Any]) -> None:
    """Verify the shared phone matches the token's phone, then issue OTP."""
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
        await _send_message(chat_id, (
            "Сессия истекла. Вернитесь на сайт и начните заново."
        ), url_button=("Открыть TajCar.tj", SITE_URL))
        return

    if status_val == "phone_mismatch":
        await _send_message(chat_id, (
            "Номер телефона не совпадает с тем, что вы ввели на сайте.\n\n"
            "Введите на сайте тот же номер, что зарегистрирован в Telegram, "
            "или используйте другой способ входа."
        ), url_button=("Открыть TajCar.tj", SITE_URL))
        return

    if status_val == "already_linked":
        await _send_message(chat_id, (
            "Этот Telegram-аккаунт уже привязан к другому номеру.\n\n"
            "Войдите через тот номер или обратитесь в поддержку."
        ), url_button=("Открыть TajCar.tj", SITE_URL))
        return

    # status_val == "otp_sent"
    code = result["code"]
    spaced = " ".join(code)
    await _send_message(
        chat_id,
        f"Номер подтверждён\n\n"
        f"Ваш код MOSHINA\\.TJ:\n\n`{code}`\n\n_{spaced}_\n\n"
        f"Нажмите на код, чтобы скопировать\\.\n"
        f"Введите его на сайте — код действует 10 минут\\.\n"
        f"Никому не передавайте этот код\\.",
        parse_mode="MarkdownV2",
        url_button=("Открыть TajCar.tj", f"{SITE_URL}/auth/register"),
    )


async def send_welcome_message(chat_id: str, name: str | None, language: str = "ru") -> None:
    """Called by verify-otp after successful login to send a rich welcome message."""
    is_tj = language == "tj"

    if is_tj:
        greeting = f"Хуш омадед{', ' + name if name else ''}!"
        text = (
            f"<b>{greeting}</b>\n\n"
            f"Шумо бомуваффақият ба TajCar.tj пайваст шудед.\n\n"
            f"Тавассути ин бот шумо огоҳиҳо мегиред:\n"
            f"• Вазъияти эълонҳои шумо\n"
            f"• Паёмҳои нав аз харидорон\n"
            f"• Навсозиҳои муҳими аккаунт\n\n"
            f"<b>Фармонҳои дастрас:</b>\n"
            f"/start — Саҳифаи асосӣ\n"
            f"/mylistings — Эълонҳои ман\n"
            f"/status — Вазъияти аккаунт\n"
            f"/help — Кӯмак\n\n"
            f"Аккаунти шумо фаъол аст ✓"
        )
        button_label = "Кушодани TajCar.tj"
    else:
        greeting = f"Добро пожаловать{', ' + name if name else ''}!"
        text = (
            f"<b>{greeting}</b>\n\n"
            f"Вы успешно подключили Telegram к TajCar.tj.\n\n"
            f"Через этот бот вы будете получать уведомления о:\n"
            f"• Статусе ваших объявлений\n"
            f"• Новых сообщениях от покупателей\n"
            f"• Важных обновлениях аккаунта\n\n"
            f"<b>Доступные команды:</b>\n"
            f"/start — Главная\n"
            f"/mylistings — Мои объявления\n"
            f"/status — Статус аккаунта\n"
            f"/help — Помощь\n\n"
            f"Ваш аккаунт активен ✓"
        )
        button_label = "Открыть TajCar.tj"

    await _send_message(
        chat_id,
        text,
        parse_mode="HTML",
        url_button=(button_label, SITE_URL),
    )


async def _send_contact_request(chat_id: str, text: str) -> None:
    """Send a message with a 'Share phone number' keyboard button."""
    import httpx
    bot_token = settings.telegram_bot_token
    if not bot_token or not chat_id:
        return
    payload: dict[str, Any] = {
        "chat_id": chat_id,
        "text": text,
        "reply_markup": {
            "keyboard": [[{"text": "Поделиться номером телефона", "request_contact": True}]],
            "resize_keyboard": True,
            "one_time_keyboard": True,
        },
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                json=payload,
            )
    except Exception:
        logger.exception("Failed to send contact request to %s", chat_id)


async def _send_message(
    chat_id: str,
    text: str,
    parse_mode: str = "",
    url_button: tuple[str, str] | None = None,
) -> None:
    """Send a message via the Telegram Bot API, optionally with one URL button."""
    import httpx
    bot_token = settings.telegram_bot_token
    if not bot_token or not chat_id:
        return
    try:
        payload: dict[str, Any] = {
            "chat_id": chat_id,
            "text": text,
            # Remove any leftover keyboard when sending a normal message
            "reply_markup": {"remove_keyboard": True},
        }
        if parse_mode:
            payload["parse_mode"] = parse_mode
        if url_button:
            label, url = url_button
            payload["reply_markup"] = {
                "inline_keyboard": [[{"text": label, "url": url}]]
            }
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                json=payload,
            )
    except Exception:
        logger.exception("Failed to send Telegram message to %s", chat_id)


# ---------------------------------------------------------------------------
# Telegram Mini App / Web App login
# ---------------------------------------------------------------------------

class WebAppLoginPayload(BaseModel):
    init_data: str


def _validate_telegram_init_data(init_data: str, bot_token: str) -> dict | None:
    """Validate Telegram WebApp initData HMAC signature.

    Returns the parsed ``user`` dict from initData if the signature is valid,
    or ``None`` if validation fails.

    Reference: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
    """
    params = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = params.pop("hash", None)
    if not received_hash:
        return None

    # Build the data-check string: sorted key=value pairs joined by newlines
    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(params.items()))

    # secret_key = HMAC-SHA256("WebAppData", bot_token)
    secret_key = hmac.new(
        b"WebAppData",
        bot_token.encode(),
        hashlib.sha256,
    ).digest()

    # computed = HMAC-SHA256(secret_key, data_check_string)
    computed = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(computed, received_hash):
        return None

    # Reject replayed initData older than 10 minutes
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
    """Authenticate a user via Telegram Mini App initData.

    Steps:
    1. Validate initData HMAC using the bot token.
    2. Extract the Telegram user ID from initData.
    3. Look up the User by telegram_chat_id.
    4. Issue a JWT and set it as an HttpOnly cookie.

    Returns:
        200 + JWT token if the account is linked.
        401 if the initData signature is invalid.
        404 if no account is linked to this Telegram user.
    """
    from app.auth import create_access_token
    from app.config import settings

    bot_token = settings.telegram_bot_token
    if not bot_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Telegram bot not configured",
        )

    tg_user = _validate_telegram_init_data(payload.init_data, bot_token)
    if tg_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram initData signature",
        )

    tg_id = tg_user.get("id")
    if not tg_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Telegram user ID missing from initData",
        )

    chat_id_str = str(tg_id)

    db: Session = SessionLocal()
    try:
        user = (
            db.query(User)
            .filter(
                User.telegram_chat_id == chat_id_str,
                User.is_deleted == False,
            )
            .first()
        )

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not linked",
            )

        if user.is_banned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is suspended",
            )

        token = create_access_token(
            {"sub": str(user.id), "role": user.role.value},
            token_version=user.token_version,
        )

        # Set HttpOnly cookie using the same settings as the main auth flow
        # so that cross-origin (Vercel + Render) requests work correctly.
        is_prod = settings.environment == "production"
        response.set_cookie(
            key="token",
            value=token,
            httponly=True,
            secure=is_prod,
            samesite="none" if is_prod else "lax",
            max_age=60 * 60 * 24 * 7,  # 7 days
            path="/",
        )

        return {"success": True, "data": {"token": token}, "message": "Logged in via Telegram"}

    finally:
        db.close()
