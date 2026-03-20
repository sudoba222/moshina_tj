"""Telegram bot webhook handler.

Register the webhook once:
  GET https://api.telegram.org/bot<TOKEN>/setWebhook
      ?url=https://tajcar-api.onrender.com/telegram/webhook
      &secret_token=<TELEGRAM_WEBHOOK_SECRET>

No separate process needed — Telegram POSTs updates to this endpoint.
"""
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import OtpCode, TelegramToken, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/telegram", tags=["telegram"])

SITE_URL = os.getenv("NEXT_PUBLIC_SITE_URL", "https://tajcar-frontend.vercel.app")


@router.post("/webhook")
async def telegram_webhook(request: Request) -> dict[str, str]:
    """Receive updates from Telegram and handle /start <token> commands."""
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

    text: str = message.get("text", "")
    chat_id: str = str(message.get("chat", {}).get("id", ""))

    # Extract sender's Telegram name
    from_user: dict[str, Any] = message.get("from", {})
    first_name: str = from_user.get("first_name", "")
    last_name: str = from_user.get("last_name", "")
    telegram_name = (first_name + (" " + last_name if last_name else "")).strip() or None

    if not text.startswith("/start"):
        await _send_message(chat_id, (
            "Привет! Я бот TajCar.tj.\n"
            "Откройте сайт и нажмите «Войти через Telegram», чтобы получить код подтверждения."
        ), url_button=("Открыть TajCar.tj", SITE_URL))
        return {"ok": "true"}

    parts = text.strip().split(maxsplit=1)
    token_str = parts[1] if len(parts) > 1 else ""

    if not token_str:
        await _send_message(chat_id, (
            "Привет! Я бот TajCar.tj.\n"
            "Откройте сайт и нажмите «Войти через Telegram», чтобы получить код подтверждения."
        ), url_button=("Открыть TajCar.tj", SITE_URL))
        return {"ok": "true"}

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
                "Вернитесь на сайт и запросите новый код."
            ), url_button=("Открыть TajCar.tj", SITE_URL))
            return {"ok": "true"}

        code = str(secrets.randbelow(900000) + 100000)
        expires_at = now + timedelta(minutes=10)

        # Invalidate old unused OTPs for this phone
        db.query(OtpCode).filter(
            OtpCode.phone == tg_token.phone,
            OtpCode.is_used == False,
        ).update({"is_used": True})

        db.add(OtpCode(phone=tg_token.phone, code=code, expires_at=expires_at))

        # Store Telegram name and chat_id on the token for use in verify-otp
        tg_token.is_used = True
        tg_token.telegram_name = telegram_name
        tg_token.telegram_chat_id = chat_id

        # Save telegram_chat_id on the user if they already exist
        user = (
            db.query(User)
            .filter(User.phone == tg_token.phone, User.is_deleted == False)
            .first()
        )
        if user and not user.telegram_chat_id:
            user.telegram_chat_id = chat_id

        db.commit()

        await _send_message(
            chat_id,
            f"Ваш код подтверждения TajCar.tj:\n\n*{code}*\n\n"
            f"Введите этот код на сайте. Код действителен 10 минут.\n"
            f"Никому не сообщайте этот код.",
            parse_mode="Markdown",
            url_button=("Открыть TajCar.tj", f"{SITE_URL}/auth/register"),
        )
    except Exception:
        logger.exception("Error processing Telegram webhook")
        await _send_message(chat_id, "Произошла ошибка. Попробуйте позже.")
    finally:
        db.close()

    return {"ok": "true"}


async def send_welcome_message(chat_id: str, name: str | None) -> None:
    """Called by verify-otp after successful login to send a welcome confirmation."""
    greeting = f"Добро пожаловать{', ' + name if name else ''}!"
    await _send_message(
        chat_id,
        f"✅ {greeting}\n\nВы успешно вошли в TajCar.tj.\nПерейдите на сайт, чтобы просмотреть объявления.",
        url_button=("Открыть TajCar.tj", SITE_URL),
    )


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
        payload: dict[str, Any] = {"chat_id": chat_id, "text": text}
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
