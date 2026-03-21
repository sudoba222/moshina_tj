"""
Send Telegram notifications to users by user_id.
Import and call from route handlers after key events.

Usage:
    from app.services.telegram_notifier import send_telegram_notification

    await send_telegram_notification(
        user_id=user.id,
        notification_type='listing_approved',
        payload={'car_name': 'Toyota Camry 2020', 'listing_id': str(listing.id)},
    )
"""
import logging
from typing import Optional
from uuid import UUID

logger = logging.getLogger(__name__)


async def send_telegram_notification(
    user_id: UUID,
    notification_type: str,
    payload: dict,
) -> None:
    """Send a Telegram notification to a user.

    notification_type values:
      - 'listing_approved': payload = {'car_name': str, 'listing_id': str}
      - 'new_message':      payload = {'sender_name': str, 'preview': str, 'conversation_id': str}
      - 'support_reply':    payload = {'text': str}

    Silently returns if:
      - user has no telegram_chat_id
      - bot application is not running
      - user has blocked the bot (Forbidden error is logged, not raised)
    """
    from app.database import SessionLocal
    from app.models import User
    from app.telegram_bot import get_bot_application

    db = SessionLocal()
    try:
        user: Optional[User] = db.query(User).filter(User.id == user_id).first()
        if not user or not user.telegram_chat_id:
            return

        chat_id = user.telegram_chat_id
        lang = getattr(user, "language", "ru") or "ru"

        application = get_bot_application()
        if not application:
            logger.warning(
                "telegram_notifier: bot application not running, skipping notification for user %s",
                user_id,
            )
            return

        bot = application.bot

        if notification_type == "listing_approved":
            car_name = payload.get("car_name", "")
            listing_id = payload.get("listing_id", "")
            url = f"https://tajcar.tj/car/{listing_id}"

            if lang == "tj":
                text = f"✅ Эълони шумо «{car_name}» нашр шуд!\n[Дидан]({url})"
                button_label = "Дидан →"
            else:
                text = f"✅ Ваше объявление «{car_name}» опубликовано!\n[Посмотреть]({url})"
                button_label = "Смотреть →"

            from telegram import InlineKeyboardButton, InlineKeyboardMarkup

            keyboard = InlineKeyboardMarkup(
                [[InlineKeyboardButton(button_label, url=url)]]
            )
            await bot.send_message(
                chat_id=chat_id,
                text=text,
                reply_markup=keyboard,
                parse_mode="Markdown",
            )

        elif notification_type == "new_message":
            sender = payload.get("sender_name", "")
            preview = payload.get("preview", "")[:80]
            url = "https://tajcar.tj/dashboard"

            if lang == "tj":
                text = f"📩 Паёми нав аз {sender}:\n_{preview}_"
                button_label = "Ҷавоб додан →"
            else:
                text = f"📩 Новое сообщение от {sender}:\n_{preview}_"
                button_label = "Ответить →"

            from telegram import InlineKeyboardButton, InlineKeyboardMarkup

            keyboard = InlineKeyboardMarkup(
                [[InlineKeyboardButton(button_label, url=url)]]
            )
            await bot.send_message(
                chat_id=chat_id,
                text=text,
                reply_markup=keyboard,
                parse_mode="Markdown",
            )

        elif notification_type == "support_reply":
            reply_text = payload.get("text", "")
            await bot.send_message(
                chat_id=chat_id,
                text=f"💬 Поддержка: {reply_text}",
            )

        else:
            logger.warning("telegram_notifier: unknown notification_type '%s'", notification_type)

    except Exception as exc:
        # If the user blocked the bot, or any other transient error — log and continue.
        # Never crash the caller.
        logger.warning(
            "telegram_notifier failed for user %s (type=%s): %s",
            user_id,
            notification_type,
            exc,
        )
    finally:
        db.close()
