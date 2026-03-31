"""Telegram bot for TajCar — OTP delivery + interactive menu.

Run separately (polling mode):
    cd moshina-tj/backend
    source venv/bin/activate
    python -m app.telegram_bot

In production the bot is driven by the webhook handler in
app/routers/telegram_webhook.py — this module is only used when you want
to run the bot in polling mode (e.g. local dev without a public URL).

Required env vars:
    TELEGRAM_BOT_TOKEN      — BotFather token
    DATABASE_URL            — same PostgreSQL URL used by the main app
"""

import logging
import os
import random
from datetime import datetime, timedelta, timezone
from typing import Optional

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.error import Forbidden
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# In-memory state dicts (keyed by Telegram chat_id as int)
# ---------------------------------------------------------------------------

# chat_id -> True when user is expected to send a support question
_support_state: dict[int, bool] = {}

# chat_id -> True when user is expected to send a search query
_search_state: dict[int, bool] = {}

# ---------------------------------------------------------------------------
# Module-level Application reference (set in main() / set_bot_application())
# ---------------------------------------------------------------------------

_bot_application: Optional[Application] = None


def get_bot_application() -> Optional[Application]:
    """Return the running Application instance, or None if not started.

    Used by telegram_notifier to send messages without a separate bot process.
    """
    return _bot_application


def set_bot_application(app: Application) -> None:
    global _bot_application
    _bot_application = app


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _lang(user_lang: Optional[str]) -> str:
    """Normalise language to 'ru' or 'tj'."""
    return "tj" if user_lang == "tj" else "ru"


async def _safe_reply(update: Update, text: str, **kwargs) -> None:
    """Reply to the message, logging Forbidden errors instead of crashing."""
    try:
        await update.message.reply_text(text, **kwargs)
    except Forbidden:
        logger.warning("Bot was blocked by user %s", update.effective_chat.id)
    except Exception:
        logger.exception("Failed to send reply to %s", update.effective_chat.id)


async def _safe_edit(query, text: str, **kwargs) -> None:
    """Edit a callback query message, logging errors gracefully."""
    try:
        await query.edit_message_text(text, **kwargs)
    except Forbidden:
        logger.warning("Bot was blocked by user (callback)")
    except Exception:
        logger.exception("Failed to edit message")


# ---------------------------------------------------------------------------
# /start — OTP flow (with token) OR main menu (no token)
# ---------------------------------------------------------------------------

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /start command.

    With deep-link token  → existing OTP verification flow (unchanged).
    Without token         → show welcome message with inline menu.
    """
    from app.database import SessionLocal
    from app.models import OtpCode, TelegramToken, User

    args = context.args or []

    if not args:
        # No token — show main menu
        keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton("🔎 Поиск машин", callback_data="cmd_search"),
             InlineKeyboardButton("🔥 Новые авто", callback_data="cmd_hot")],
            [InlineKeyboardButton("🚗 Мой гараж", callback_data="cmd_profile"),
             InlineKeyboardButton("📞 Поддержка", callback_data="cmd_support")],
        ])
        await _safe_reply(
            update,
            "Добро пожаловать в бот TajCar.tj!\n\nВыберите действие:",
            reply_markup=keyboard,
        )
        return

    # --- OTP verification flow ---
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
            await _safe_reply(
                update,
                "Ссылка недействительна или истекла.\n"
                "Вернитесь в приложение и запросите новый код.",
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

        await _safe_reply(
            update,
            f"Ваш код подтверждения TajCar.tj:\n\n"
            f"*{code}*\n\n"
            f"Введите его в приложении. Код действителен 10 минут.\n"
            f"Никому не сообщайте этот код.",
            parse_mode="Markdown",
        )

    except Exception:
        logger.exception("Error in /start handler")
        await _safe_reply(update, "Произошла ошибка. Попробуйте позже.")
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Callback query handlers
# ---------------------------------------------------------------------------

async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Route inline-keyboard button presses to the appropriate handler."""
    query = update.callback_query
    await query.answer()

    data = query.data or ""

    if data == "cmd_hot":
        await _cmd_hot(query)
    elif data == "cmd_profile":
        await _cmd_profile(query)
    elif data == "cmd_support":
        await _cmd_support(query)
    elif data == "cmd_search":
        await _cmd_search(query)


async def _cmd_hot(query) -> None:
    """Show the 5 most recently published listings."""
    from app.database import SessionLocal
    from app.models import Listing, ListingStatus
    from sqlalchemy.orm import joinedload

    db = SessionLocal()
    try:
        listings = (
            db.query(Listing)
            .options(joinedload(Listing.images))
            .filter(Listing.status == ListingStatus.active)
            .order_by(Listing.created_at.desc())
            .limit(5)
            .all()
        )

        if not listings:
            await _safe_edit(query, "Активных объявлений пока нет.")
            return

        await _safe_edit(query, "🔥 Последние объявления:")

        bot = query.bot
        chat_id = query.message.chat_id

        for listing in listings:
            car_name = f"{listing.brand} {listing.model} {listing.year}"
            price = f"{int(listing.price):,} {listing.currency.value if listing.currency else 'USD'}"
            city = listing.city or ""
            caption = f"*{car_name}*\n💰 {price}\n📍 {city}"

            url = f"https://tajcar.tj/car/{listing.id}"
            keyboard = InlineKeyboardMarkup(
                [[InlineKeyboardButton("Смотреть →", url=url)]]
            )

            # Try to send with photo; fall back to text if no image
            first_image = listing.images[0] if listing.images else None
            try:
                if first_image and first_image.url:
                    await bot.send_photo(
                        chat_id=chat_id,
                        photo=first_image.url,
                        caption=caption,
                        parse_mode="Markdown",
                        reply_markup=keyboard,
                    )
                else:
                    await bot.send_message(
                        chat_id=chat_id,
                        text=caption,
                        parse_mode="Markdown",
                        reply_markup=keyboard,
                    )
            except Forbidden:
                logger.warning("Bot blocked by user %s", chat_id)
                return
            except Exception:
                logger.exception("Failed to send listing card for %s", listing.id)

    except Exception:
        logger.exception("Error in cmd_hot")
        try:
            await _safe_edit(query, "Произошла ошибка. Попробуйте позже.")
        except Exception:
            pass
    finally:
        db.close()


async def _cmd_profile(query) -> None:
    """Show the user's profile info or prompt them to link their account."""
    from app.database import SessionLocal
    from app.models import Listing, ListingStatus, User
    from sqlalchemy import func as sqlfunc

    chat_id = str(query.message.chat_id)
    db = SessionLocal()
    try:
        user = db.query(User).filter(
            User.telegram_chat_id == chat_id,
            User.is_deleted == False,
        ).first()

        if not user:
            await _safe_edit(
                query,
                "Аккаунт не привязан. Войдите на tajcar.tj и подтвердите Telegram.",
            )
            return

        lang = _lang(getattr(user, "language", None))

        active_count = (
            db.query(sqlfunc.count(Listing.id))
            .filter(
                Listing.user_id == user.id,
                Listing.status == ListingStatus.active,
            )
            .scalar()
        ) or 0

        contact = user.email or user.phone or "—"
        name = user.name or "—"

        if lang == "tj":
            text = (
                f"👤 *{name}*\n"
                f"📬 {contact}\n"
                f"🚗 Эълонхои фаъол: {active_count}"
            )
        else:
            text = (
                f"👤 *{name}*\n"
                f"📬 {contact}\n"
                f"🚗 Активных объявлений: {active_count}"
            )

        await _safe_edit(query, text, parse_mode="Markdown")

    except Exception:
        logger.exception("Error in cmd_profile")
        try:
            await _safe_edit(query, "Произошла ошибка. Попробуйте позже.")
        except Exception:
            pass
    finally:
        db.close()


async def _cmd_support(query) -> None:
    """Enter support mode — next message from this chat becomes a support ticket."""
    chat_id_int = query.message.chat_id
    _support_state[chat_id_int] = True

    await _safe_edit(
        query,
        "Напишите ваш вопрос, и наша команда ответит вам как можно скорее.",
    )


async def _cmd_search(query) -> None:
    """Enter search mode — next message from this chat is used as a search query."""
    chat_id_int = query.message.chat_id
    _search_state[chat_id_int] = True

    await _safe_edit(
        query,
        "Введите название марки или модели для поиска:",
    )


# ---------------------------------------------------------------------------
# Text message handler — routes to support ticket or search
# ---------------------------------------------------------------------------

async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle plain text messages from users."""
    chat_id_int: int = update.effective_chat.id
    text: str = (update.message.text or "").strip()

    if not text:
        return

    if _support_state.get(chat_id_int):
        del _support_state[chat_id_int]
        await _handle_support_message(update, chat_id_int, text)
        return

    if _search_state.get(chat_id_int):
        del _search_state[chat_id_int]
        await _handle_search_message(update, text)
        return

    # Default: show the menu
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("🔎 Поиск машин", callback_data="cmd_search"),
         InlineKeyboardButton("🔥 Новые авто", callback_data="cmd_hot")],
        [InlineKeyboardButton("🚗 Мой гараж", callback_data="cmd_profile"),
         InlineKeyboardButton("📞 Поддержка", callback_data="cmd_support")],
    ])
    await _safe_reply(
        update,
        "Выберите действие:",
        reply_markup=keyboard,
    )


async def _handle_support_message(
    update: Update, chat_id_int: int, text: str
) -> None:
    """Create a support Conversation + Message in DB."""
    from app.database import SessionLocal
    from app.models import Conversation, ConversationType, Message, User

    chat_id = str(chat_id_int)
    db = SessionLocal()
    try:
        user = db.query(User).filter(
            User.telegram_chat_id == chat_id,
            User.is_deleted == False,
        ).first()

        if not user:
            await _safe_reply(
                update,
                "Для отправки обращения нужно привязать аккаунт. "
                "Войдите на tajcar.tj и подтвердите Telegram.",
            )
            return

        # Find or create a support conversation (participant2 is NULL for support)
        conversation = (
            db.query(Conversation)
            .filter(
                Conversation.participant1_id == user.id,
                Conversation.type == ConversationType.support,
                Conversation.participant2_id == None,
            )
            .order_by(Conversation.created_at.desc())
            .first()
        )

        if not conversation:
            conversation = Conversation(
                type=ConversationType.support,
                participant1_id=user.id,
                participant2_id=None,
                listing_id=None,
            )
            db.add(conversation)
            db.flush()  # get ID before commit

        message_obj = Message(
            conversation_id=conversation.id,
            sender_id=user.id,
            content=text,
        )
        db.add(message_obj)
        db.commit()
        db.refresh(conversation)

        lang = _lang(getattr(user, "language", None))
        if lang == "tj":
            reply = f"Дархости #{str(conversation.id)[:8]} сохта шуд. Дар наздиктарин вакт ҷавоб медиҳем."
        else:
            reply = f"Тикет #{str(conversation.id)[:8]} создан. Ответим в ближайшее время."

        await _safe_reply(update, reply)

    except Exception:
        logger.exception("Error creating support ticket")
        await _safe_reply(update, "Произошла ошибка. Попробуйте позже.")
    finally:
        db.close()


async def _handle_search_message(update: Update, query_text: str) -> None:
    """Search listings by brand/model and show top 5 results."""
    from app.database import SessionLocal
    from app.models import Listing, ListingStatus
    from sqlalchemy import or_
    from sqlalchemy.orm import joinedload

    db = SessionLocal()
    try:
        listings = (
            db.query(Listing)
            .options(joinedload(Listing.images))
            .filter(
                Listing.status == ListingStatus.active,
                or_(
                    Listing.brand.ilike(f"%{query_text}%"),
                    Listing.model.ilike(f"%{query_text}%"),
                ),
            )
            .order_by(Listing.created_at.desc())
            .limit(5)
            .all()
        )

        if not listings:
            await _safe_reply(
                update,
                f"По запросу «{query_text}» ничего не найдено.",
            )
            return

        lines = [f"Найдено {len(listings)} объявление(й) по «{query_text}»:\n"]
        for listing in listings:
            price = f"{int(listing.price):,} {listing.currency.value if listing.currency else 'USD'}"
            url = f"https://tajcar.tj/car/{listing.id}"
            lines.append(
                f"• *{listing.brand} {listing.model} {listing.year}* — {price}\n  {url}"
            )

        await _safe_reply(
            update,
            "\n".join(lines),
            parse_mode="Markdown",
        )

    except Exception:
        logger.exception("Error in search handler")
        await _safe_reply(update, "Произошла ошибка при поиске. Попробуйте позже.")
    finally:
        db.close()


# ---------------------------------------------------------------------------
# /help — list available commands
# ---------------------------------------------------------------------------

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/help — show all available commands."""
    text = (
        "<b>Доступные команды:</b>\n\n"
        "/start — Главное меню\n"
        "/mylistings — Мои объявления\n"
        "/status — Статус аккаунта\n"
        "/help — Этот список\n\n"
        "Также используйте кнопки меню для навигации."
    )
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("Открыть TajCar.tj", url="https://tajcar.tj")]
    ])
    await _safe_reply(update, text, parse_mode="HTML", reply_markup=keyboard)


# ---------------------------------------------------------------------------
# /mylistings — show listing counts by status
# ---------------------------------------------------------------------------

async def mylistings_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/mylistings — show a summary of the user's listings."""
    from app.database import SessionLocal
    from app.models import Listing, ListingStatus, User
    from sqlalchemy import func as sqlfunc

    chat_id = str(update.effective_chat.id)
    db = SessionLocal()
    try:
        user = db.query(User).filter(
            User.telegram_chat_id == chat_id,
            User.is_deleted == False,
        ).first()

        if not user:
            await _safe_reply(
                update,
                "Аккаунт не привязан.\nОткройте tajcar.tj и войдите через Telegram.",
            )
            return

        active_count = db.query(sqlfunc.count(Listing.id)).filter(
            Listing.user_id == user.id, Listing.status == ListingStatus.active, Listing.is_deleted == False
        ).scalar() or 0
        pending_count = db.query(sqlfunc.count(Listing.id)).filter(
            Listing.user_id == user.id, Listing.status == ListingStatus.pending, Listing.is_deleted == False
        ).scalar() or 0
        rejected_count = db.query(sqlfunc.count(Listing.id)).filter(
            Listing.user_id == user.id, Listing.status == ListingStatus.rejected, Listing.is_deleted == False
        ).scalar() or 0

        lang = _lang(getattr(user, "language", None))
        dashboard_url = "https://tajcar.tj/dashboard"

        if lang == "tj":
            text = (
                f"<b>Эълонҳои шумо:</b>\n\n"
                f"Фаъол: {active_count}\n"
                f"Дар баррасӣ: {pending_count}\n"
                f"Рад шуда: {rejected_count}"
            )
            btn_label = "Кабинети шахсӣ"
        else:
            text = (
                f"<b>Ваши объявления:</b>\n\n"
                f"Активных: {active_count}\n"
                f"На проверке: {pending_count}\n"
                f"Отклонённых: {rejected_count}"
            )
            btn_label = "Личный кабинет"

        keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton(btn_label, url=dashboard_url)],
        ])
        await _safe_reply(update, text, parse_mode="HTML", reply_markup=keyboard)

    except Exception:
        logger.exception("Error in /mylistings handler")
        await _safe_reply(update, "Произошла ошибка. Попробуйте позже.")
    finally:
        db.close()


# ---------------------------------------------------------------------------
# /status — show account status
# ---------------------------------------------------------------------------

async def status_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/status — show account status and role."""
    from app.database import SessionLocal
    from app.models import User

    chat_id = str(update.effective_chat.id)
    db = SessionLocal()
    try:
        user = db.query(User).filter(
            User.telegram_chat_id == chat_id,
            User.is_deleted == False,
        ).first()

        if not user:
            await _safe_reply(
                update,
                "Аккаунт не привязан.\nОткройте tajcar.tj и войдите через Telegram.",
            )
            return

        lang = _lang(getattr(user, "language", None))
        status_icon = "Заблокирован" if user.is_banned else "Активен"
        role_label = user.role.value if user.role else "user"
        name = user.name or "—"

        if lang == "tj":
            text = (
                f"<b>Ҳолати аккаунт:</b>\n\n"
                f"Ном: {name}\n"
                f"Ҳолат: {'Маҳдуд' if user.is_banned else 'Фаъол'}\n"
                f"Нақш: {role_label}"
            )
        else:
            text = (
                f"<b>Статус аккаунта:</b>\n\n"
                f"Имя: {name}\n"
                f"Статус: {status_icon}\n"
                f"Роль: {role_label}"
            )

        await _safe_reply(update, text, parse_mode="HTML")

    except Exception:
        logger.exception("Error in /status handler")
        await _safe_reply(update, "Произошла ошибка. Попробуйте позже.")
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Entry point (polling mode)
# ---------------------------------------------------------------------------

def main() -> None:
    """Start the bot in long-polling mode (for local development)."""
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

    application = Application.builder().token(bot_token).build()
    set_bot_application(application)

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("mylistings", mylistings_command))
    application.add_handler(CommandHandler("status", status_command))
    application.add_handler(CallbackQueryHandler(handle_callback))
    # Handle text messages that are NOT commands
    application.add_handler(
        MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text)
    )

    logger.info("TajCar Telegram bot starting (polling)...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
