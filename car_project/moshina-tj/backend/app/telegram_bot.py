"""Telegram bot for TajCar OTP delivery.

Run separately:
    cd moshina-tj/backend
    source venv/bin/activate
    python -m app.telegram_bot

Required env vars:
    TELEGRAM_BOT_TOKEN      — BotFather token
    DATABASE_URL            — same PostgreSQL URL used by the main app
"""

import logging
import os
import random
from datetime import datetime, timedelta, timezone

from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

logger = logging.getLogger(__name__)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /start command (with or without a deep-link token)."""
    # Import here to avoid circular imports if this module is imported elsewhere
    from app.database import SessionLocal
    from app.models import OtpCode, TelegramToken, User

    args = context.args or []

    if not args:
        await update.message.reply_text(
            "Привет! Я бот TajCar.tj.\n"
            "Откройте приложение и нажмите «Войти через Telegram», чтобы получить код подтверждения."
        )
        return

    token_str = args[0]
    db = SessionLocal()
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
            await update.message.reply_text(
                "Ссылка недействительна или истекла.\n"
                "Вернитесь в приложение и запросите новый код."
            )
            return

        # Generate a 6-digit OTP
        code = str(random.randint(100000, 999999))
        expires_at = now + timedelta(minutes=10)

        # Invalidate old unused OTPs for this phone
        db.query(OtpCode).filter(
            OtpCode.phone == tg_token.phone,
            OtpCode.is_used == False,
        ).update({"is_used": True})

        db.add(OtpCode(phone=tg_token.phone, code=code, expires_at=expires_at))

        # Mark token as used and save the Telegram chat_id on the user if they exist
        tg_token.is_used = True
        chat_id = str(update.effective_chat.id)
        user = (
            db.query(User)
            .filter(User.phone == tg_token.phone, User.is_deleted == False)
            .first()
        )
        if user and not user.telegram_chat_id:
            user.telegram_chat_id = chat_id

        db.commit()

        await update.message.reply_text(
            f"Ваш код подтверждения TajCar.tj:\n\n"
            f"*{code}*\n\n"
            f"Введите его в приложении. Код действителен 10 минут.\n"
            f"Никому не сообщайте этот код.",
            parse_mode="Markdown",
        )

    except Exception:
        logger.exception("Error in /start handler")
        await update.message.reply_text("Произошла ошибка. Попробуйте позже.")
    finally:
        db.close()


def main() -> None:
    # Load .env from the backend root (two levels up from this file)
    from pathlib import Path
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent / ".env"
    load_dotenv(dotenv_path=env_path)

    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not bot_token:
        raise ValueError("TELEGRAM_BOT_TOKEN env var is required")

    logging.basicConfig(
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        level=logging.INFO,
    )

    app = Application.builder().token(bot_token).build()
    app.add_handler(CommandHandler("start", start))

    logger.info("TajCar Telegram bot starting...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
