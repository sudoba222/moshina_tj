"""Telegram bot webhook handler.

Register the webhook once by calling:
  POST https://api.telegram.org/bot<TOKEN>/setWebhook
      ?url=https://tajcar-api.onrender.com/telegram/webhook

No separate process needed — Telegram POSTs updates to this endpoint.
"""
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import OtpCode, TelegramToken, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/telegram", tags=["telegram"])


@router.post("/webhook")
async def telegram_webhook(request: Request) -> dict[str, str]:
    """Receive updates from Telegram and handle /start <token> commands."""
    # Verify the secret token header that we'll set when registering the webhook
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

    if not text.startswith("/start"):
        await _send_message(chat_id, (
            "Привет! Я бот TajCar.tj.\n"
            "Откройте сайт и нажмите «Войти через Telegram», чтобы получить код подтверждения."
        ))
        return {"ok": "true"}

    parts = text.strip().split(maxsplit=1)
    token_str = parts[1] if len(parts) > 1 else ""

    if not token_str:
        await _send_message(chat_id, (
            "Привет! Я бот TajCar.tj.\n"
            "Откройте сайт и нажмите «Войти через Telegram», чтобы получить код подтверждения."
        ))
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
            ))
            return {"ok": "true"}

        code = str(secrets.randbelow(900000) + 100000)
        expires_at = now + timedelta(minutes=10)

        # Invalidate old unused OTPs for this phone
        db.query(OtpCode).filter(
            OtpCode.phone == tg_token.phone,
            OtpCode.is_used == False,
        ).update({"is_used": True})

        db.add(OtpCode(phone=tg_token.phone, code=code, expires_at=expires_at))
        tg_token.is_used = True

        user = (
            db.query(User)
            .filter(User.phone == tg_token.phone, User.is_deleted == False)
            .first()
        )
        if user and not user.telegram_chat_id:
            user.telegram_chat_id = str(chat_id)

        db.commit()

        await _send_message(
            chat_id,
            f"Ваш код подтверждения TajCar.tj:\n\n*{code}*\n\nВведите его на сайте. Код действителен 10 минут.\nНикому не сообщайте этот код.",
            parse_mode="Markdown",
        )
    except Exception:
        logger.exception("Error processing Telegram webhook")
        await _send_message(chat_id, "Произошла ошибка. Попробуйте позже.")
    finally:
        db.close()

    return {"ok": "true"}


async def _send_message(chat_id: str, text: str, parse_mode: str = "") -> None:
    """Send a message via the Telegram Bot API."""
    import httpx
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    if not bot_token or not chat_id:
        return
    try:
        payload: dict[str, Any] = {"chat_id": chat_id, "text": text}
        if parse_mode:
            payload["parse_mode"] = parse_mode
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                json=payload,
            )
    except Exception:
        logger.exception("Failed to send Telegram message to %s", chat_id)
