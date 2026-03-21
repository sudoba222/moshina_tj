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
import hashlib
import hmac
import json
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import parse_qsl

from fastapi import APIRouter, HTTPException, Request, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import OtpCode, TelegramToken, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/telegram", tags=["telegram"])

SITE_URL = os.getenv("NEXT_PUBLIC_SITE_URL", "https://tajcar-frontend.vercel.app")


def _normalize_phone(phone: str) -> str:
    """Normalize to +XXXXXXXXXXX for comparison."""
    digits = "".join(c for c in phone if c.isdigit())
    return "+" + digits


@router.post("/webhook")
async def telegram_webhook(request: Request) -> dict[str, str]:
    """Receive updates from Telegram."""
    secret = os.getenv("TELEGRAM_WEBHOOK_SECRET", "")
    if secret:
        header_secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
        if not secrets.compare_digest(header_secret, secret):
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

    if not text.startswith("/start"):
        await _send_message(chat_id, (
            "Привет! Я бот TajCar.tj\n\n"
            f"Сайт: {SITE_URL}\n\n"
            "Откройте сайт → Регистрация → «Войти через Telegram», чтобы начать."
        ), url_button=("Открыть TajCar.tj", SITE_URL))
        return {"ok": "true"}

    parts = text.strip().split(maxsplit=1)
    token_str = parts[1] if len(parts) > 1 else ""

    if not token_str:
        await _send_message(chat_id, (
            "Привет! Я бот TajCar.tj\n\n"
            f"Сайт: {SITE_URL}\n\n"
            "Откройте сайт → Регистрация → «Войти через Telegram», чтобы начать."
        ), url_button=("Открыть TajCar.tj", SITE_URL))
        return {"ok": "true"}

    await _handle_start(chat_id, token_str, telegram_name)
    return {"ok": "true"}


async def _handle_start(chat_id: str, token_str: str, telegram_name: str | None) -> None:
    """Validate the deep-link token and ask the user to share their phone."""
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
            await _send_message(chat_id, (
                "Ссылка недействительна или истекла.\n"
                f"Вернитесь на сайт и запросите новую ссылку: {SITE_URL}"
            ), url_button=("Открыть TajCar.tj", SITE_URL))
            return

        # Save chat_id and name on token — marks it as "waiting for contact"
        tg_token.telegram_chat_id = chat_id
        tg_token.telegram_name = telegram_name
        db.commit()

    except Exception:
        logger.exception("Error in _handle_start")
        await _send_message(chat_id, "Произошла ошибка. Попробуйте позже.")
        return
    finally:
        db.close()

    # Ask user to share their phone number
    await _send_contact_request(
        chat_id,
        f"Вы вводили номер на сайте.\n\nНажмите кнопку ниже, чтобы подтвердить ваш номер телефона и получить код подтверждения.",
    )


async def _handle_contact(chat_id: str, contact: dict[str, Any]) -> None:
    """Verify the shared phone matches the token's phone, then issue OTP."""
    raw_phone: str = contact.get("phone_number", "")
    if not raw_phone:
        await _send_message(chat_id, "Не удалось получить номер. Попробуйте ещё раз.")
        return

    shared_phone = _normalize_phone(raw_phone)

    db: Session = SessionLocal()
    try:
        now = datetime.now(timezone.utc)

        # Find the pending token for this chat (set in _handle_start, not yet used)
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
            await _send_message(chat_id, (
                "Сессия истекла. Вернитесь на сайт и начните заново."
            ), url_button=("Открыть TajCar.tj", SITE_URL))
            return

        token_phone = _normalize_phone(tg_token.phone)

        if shared_phone != token_phone:
            # Phone mismatch — invalidate token and reject
            tg_token.is_used = True
            db.commit()
            await _send_message(chat_id, (
                f"Номер не совпадает.\n\n"
                f"На сайте вы ввели: {tg_token.phone}\n"
                f"В вашем Telegram: {shared_phone}\n\n"
                "Введите на сайте тот же номер, что зарегистрирован в Telegram, "
                "или используйте другой способ входа."
            ), url_button=("Открыть TajCar.tj", SITE_URL))
            return

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
            await _send_message(chat_id, (
                "Этот Telegram-аккаунт уже привязан к другому номеру.\n\n"
                "Войдите через тот номер или обратитесь в поддержку."
            ), url_button=("Открыть TajCar.tj", SITE_URL))
            return

        # ✅ Phone verified — generate OTP
        code = str(secrets.randbelow(900000) + 100000)
        expires_at = now + timedelta(minutes=10)

        # Invalidate old unused OTPs for this phone
        db.query(OtpCode).filter(
            OtpCode.phone == tg_token.phone,
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

        spaced = " ".join(code)
        await _send_message(
            chat_id,
            f"Номер подтверждён\n\n"
            f"Ваш код TajCar\\.tj:\n\n`{code}`\n\n_{spaced}_\n\n"
            f"Нажмите на код, чтобы скопировать\\.\n"
            f"Введите его на сайте — код действует 10 минут\\.\n"
            f"Никому не передавайте этот код\\.",
            parse_mode="MarkdownV2",
            url_button=("Открыть TajCar.tj", f"{SITE_URL}/auth/register"),
        )

    except Exception:
        logger.exception("Error in _handle_contact")
        await _send_message(chat_id, "Произошла ошибка. Попробуйте позже.")
    finally:
        db.close()


async def send_welcome_message(chat_id: str, name: str | None) -> None:
    """Called by verify-otp after successful login to send a welcome confirmation."""
    greeting = f"Добро пожаловать{', ' + name if name else ''}!"
    await _send_message(
        chat_id,
        f"{greeting}\n\nВы успешно вошли в TajCar.tj.\nПерейдите на сайт, чтобы просмотреть объявления.",
        url_button=("Открыть TajCar.tj", SITE_URL),
    )


async def _send_contact_request(chat_id: str, text: str) -> None:
    """Send a message with a 'Share phone number' keyboard button."""
    import httpx
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
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
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
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
