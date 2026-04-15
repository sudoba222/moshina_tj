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

Supported notification_type values:
    listing_pending    — payload = {car_name, listing_id}
    listing_approved   — payload = {car_name, listing_id}
    listing_rejected   — payload = {car_name, listing_id, reason}
    listing_deactivated — payload = {car_name}
    new_message        — payload = {sender_name, preview, conversation_id}
    account_banned     — payload = {reason}
    account_unbanned   — payload = {}
    dealer_verified    — payload = {business_name, dealer_id}
    support_reply      — payload = {text}
"""
import logging
import time
from typing import Optional
from uuid import UUID

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# In-memory cooldown for new_message notifications: user_id -> last sent timestamp
_message_cooldown: dict[str, float] = {}
_MESSAGE_COOLDOWN_SECONDS = 60


async def _send_telegram_message(
    chat_id: str,
    text: str,
    parse_mode: str = "HTML",
    inline_button: Optional[tuple[str, str]] = None,
    inline_buttons: Optional[list[tuple[str, str]]] = None,
) -> None:
    """Send a message via the Telegram Bot API directly using httpx.

    Silently returns if bot token is not configured or on any transient error.
    Supports one button (inline_button) or multiple buttons (inline_buttons).
    Always appends a "◀ Меню" callback button as the last row.
    """
    bot_token = settings.telegram_bot_token
    if not bot_token or not chat_id:
        return

    payload: dict = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode,
        "disable_web_page_preview": True,
    }

    menu_btn = {"text": "◀ Меню", "callback_data": "main"}

    if inline_buttons:
        rows = [[{"text": label, "url": url}] for label, url in inline_buttons]
        rows.append([menu_btn])
        payload["reply_markup"] = {"inline_keyboard": rows}
    elif inline_button:
        label, url = inline_button
        payload["reply_markup"] = {
            "inline_keyboard": [
                [{"text": label, "url": url}],
                [menu_btn],
            ]
        }
    else:
        payload["reply_markup"] = {"inline_keyboard": [[menu_btn]]}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                json=payload,
            )
    except Exception as exc:
        logger.warning("telegram_notifier: HTTP send failed for chat_id=%s: %s", chat_id, exc)


async def send_telegram_notification(
    user_id: UUID,
    notification_type: str,
    payload: dict,
) -> None:
    """Send a Telegram notification to a user.

    Silently returns if:
      - user has no telegram_chat_id
      - bot token is not configured
      - user has blocked the bot
    """
    from app.database import SessionLocal
    from app.models import User

    frontend_url = settings.frontend_url.rstrip("/")

    db = SessionLocal()
    try:
        user: Optional[User] = db.query(User).filter(User.id == user_id).first()
        if not user or not user.telegram_chat_id:
            return

        chat_id = user.telegram_chat_id
        lang = getattr(user, "language", "ru") or "ru"
        is_tj = lang == "tj"

        # ------------------------------------------------------------------
        # listing_pending — listing submitted, awaiting moderation
        # ------------------------------------------------------------------
        if notification_type == "listing_pending":
            car_name = payload.get("car_name", "")
            listing_id = payload.get("listing_id", "")
            dashboard_url = f"{frontend_url}/dashboard"

            if is_tj:
                text = (
                    f"<b>Эълон ба баррасӣ фиристода шуд</b>\n\n"
                    f"Эълони шумо барои тасдиқ фиристода шуд:\n"
                    f"<b>{car_name}</b>\n\n"
                    f"Одатан баррасӣ 1-2 соат мегирад.\n"
                    f"Мо шуморо огоҳ мекунем."
                )
                button = ("Кабинети шахсӣ", dashboard_url)
            else:
                text = (
                    f"<b>Объявление на проверке</b>\n\n"
                    f"Ваше объявление отправлено на модерацию:\n"
                    f"<b>{car_name}</b>\n\n"
                    f"Обычно проверка занимает 1-2 часа.\n"
                    f"Мы уведомим вас о результате."
                )
                button = ("Личный кабинет", dashboard_url)

            await _send_telegram_message(chat_id=chat_id, text=text, inline_button=button)

        # ------------------------------------------------------------------
        # listing_approved — listing approved and published
        # ------------------------------------------------------------------
        elif notification_type == "listing_approved":
            car_name = payload.get("car_name", "")
            listing_id = payload.get("listing_id", "")
            listing_url = f"{frontend_url}/car/{listing_id}"
            dashboard_url = f"{frontend_url}/dashboard"

            if is_tj:
                text = (
                    f"<b>Эълон нашр шуд!</b>\n\n"
                    f"Эълони шумо муваффақона аз баррасӣ гузашт:\n"
                    f"<b>{car_name}</b>\n\n"
                    f"Акнун он барои ҳамаи харидорон намоён аст.\n\n"
                    f"Пайванд барои мубодила:"
                )
                buttons = [
                    ("Дидани эълон", listing_url),
                    ("Кабинети шахсӣ", dashboard_url),
                ]
            else:
                text = (
                    f"<b>Объявление опубликовано!</b>\n\n"
                    f"Ваше объявление успешно прошло модерацию:\n"
                    f"<b>{car_name}</b>\n\n"
                    f"Теперь оно видно всем покупателям.\n\n"
                    f"Поделитесь ссылкой, чтобы продать быстрее:"
                )
                buttons = [
                    ("Открыть объявление", listing_url),
                    ("Личный кабинет", dashboard_url),
                ]

            await _send_telegram_message(chat_id=chat_id, text=text, inline_buttons=buttons)

        # ------------------------------------------------------------------
        # listing_rejected — listing rejected by moderator
        # ------------------------------------------------------------------
        elif notification_type == "listing_rejected":
            car_name = payload.get("car_name", "")
            listing_id = payload.get("listing_id", "")
            reason = payload.get("reason", "")
            edit_url = f"{frontend_url}/post?edit={listing_id}"
            support_url = f"{frontend_url}/support"

            reason_block = f"\n\n<b>Причина:</b>\n{reason}" if reason else ""

            if is_tj:
                text = (
                    f"<b>Эълон рад шуд</b>\n\n"
                    f"Мутаассифона, эълони шумо аз баррасӣ нагузашт:\n"
                    f"<b>{car_name}</b>"
                    f"{reason_block}\n\n"
                    f"Камбудиҳоро ислоҳ кунед ва дубора бифиристед."
                )
                buttons = [
                    ("Таҳрири эълон", edit_url),
                    ("Дастгирӣ", support_url),
                ]
            else:
                text = (
                    f"<b>Объявление отклонено</b>\n\n"
                    f"К сожалению, ваше объявление не прошло модерацию:\n"
                    f"<b>{car_name}</b>"
                    f"{reason_block}\n\n"
                    f"Исправьте замечания и отправьте повторно."
                )
                buttons = [
                    ("Исправить объявление", edit_url),
                    ("Поддержка", support_url),
                ]

            await _send_telegram_message(chat_id=chat_id, text=text, inline_buttons=buttons)

        # ------------------------------------------------------------------
        # listing_deactivated — listing deactivated by admin
        # ------------------------------------------------------------------
        elif notification_type == "listing_deactivated":
            car_name = payload.get("car_name", "")
            support_url = f"{frontend_url}/support"

            if is_tj:
                text = (
                    f"<b>Эълон ғайрифаъол карда шуд</b>\n\n"
                    f"Эълони шумо аз ҷониби маъмурият ғайрифаъол карда шуд:\n"
                    f"<b>{car_name}</b>\n\n"
                    f"Барои кӯмак ба дастгирӣ муроҷиат кунед."
                )
                button = ("Дастгирӣ", support_url)
            else:
                text = (
                    f"<b>Объявление деактивировано</b>\n\n"
                    f"Ваше объявление было деактивировано администратором:\n"
                    f"<b>{car_name}</b>\n\n"
                    f"Обратитесь в поддержку для уточнения причин."
                )
                button = ("Поддержка", support_url)

            await _send_telegram_message(chat_id=chat_id, text=text, inline_button=button)

        # ------------------------------------------------------------------
        # new_message — new chat message from buyer
        # ------------------------------------------------------------------
        elif notification_type == "new_message":
            # Cooldown: skip if we sent a notification to this user in the last 60 seconds
            uid_str = str(user_id)
            now = time.time()
            if now - _message_cooldown.get(uid_str, 0) < _MESSAGE_COOLDOWN_SECONDS:
                return
            _message_cooldown[uid_str] = now

            sender = payload.get("sender_name", "")
            preview = payload.get("preview", "")[:120]
            conversation_id = payload.get("conversation_id", "")
            chat_url = f"{frontend_url}/dashboard/messages/{conversation_id}" if conversation_id else f"{frontend_url}/dashboard"

            if is_tj:
                text = (
                    f"<b>Паёми нав</b>\n\n"
                    f"Аз: <b>{sender}</b>\n\n"
                    f"<i>{preview}</i>"
                )
                button = ("Ҷавоб додан", chat_url)
            else:
                text = (
                    f"<b>Новое сообщение</b>\n\n"
                    f"От: <b>{sender}</b>\n\n"
                    f"<i>{preview}</i>"
                )
                button = ("Ответить", chat_url)

            await _send_telegram_message(chat_id=chat_id, text=text, inline_button=button)

        # ------------------------------------------------------------------
        # account_banned
        # ------------------------------------------------------------------
        elif notification_type == "account_banned":
            reason = payload.get("reason", "")
            support_url = f"{frontend_url}/support"
            reason_block = f"\n\n<b>Причина:</b>\n{reason}" if reason else ""

            if is_tj:
                text = (
                    f"<b>Аккаунт баста шуд</b>\n\n"
                    f"Аккаунти шумо дар TajCar.tj аз ҷониби маъмурият маҳдуд карда шуд."
                    f"{reason_block}\n\n"
                    f"Агар ин хато бошад, бо дастгирӣ тамос гиред."
                )
                button = ("Дастгирӣ", support_url)
            else:
                text = (
                    f"<b>Аккаунт заблокирован</b>\n\n"
                    f"Ваш аккаунт на TajCar.tj был заблокирован администрацией."
                    f"{reason_block}\n\n"
                    f"Если считаете это ошибкой — обратитесь в поддержку."
                )
                button = ("Поддержка", support_url)

            await _send_telegram_message(chat_id=chat_id, text=text, inline_button=button)

        # ------------------------------------------------------------------
        # account_unbanned
        # ------------------------------------------------------------------
        elif notification_type == "account_unbanned":
            catalog_url = f"{frontend_url}/catalog"

            if is_tj:
                text = (
                    f"<b>Аккаунт барқарор шуд</b>\n\n"
                    f"Маҳдудияти аккаунти шумо бардошта шуд.\n"
                    f"Шумо метавонед дубора ба сайт ворид шавед."
                )
                button = ("Кушодани TajCar.tj", frontend_url)
            else:
                text = (
                    f"<b>Аккаунт восстановлен</b>\n\n"
                    f"Блокировка с вашего аккаунта снята.\n"
                    f"Вы можете снова войти на сайт."
                )
                button = ("Открыть TajCar.tj", frontend_url)

            await _send_telegram_message(chat_id=chat_id, text=text, inline_button=button)

        # ------------------------------------------------------------------
        # dealer_verified
        # ------------------------------------------------------------------
        elif notification_type == "dealer_verified":
            business_name = payload.get("business_name", "")
            dealer_id = payload.get("dealer_id", "")
            profile_url = f"{frontend_url}/dealers/{dealer_id}"

            if is_tj:
                text = (
                    f"<b>Дилер тасдиқ шуд!</b>\n\n"
                    f"Профили дилерии шумо <b>{business_name}</b> бомуваффақият тасдиқ шуд.\n\n"
                    f"Акнун дар паҳлӯи профили шумо нишони дилери тасдиқшуда намоён аст."
                )
                button = ("Дидани профил", profile_url)
            else:
                text = (
                    f"<b>Дилер верифицирован!</b>\n\n"
                    f"Ваш дилерский профиль <b>{business_name}</b> успешно верифицирован.\n\n"
                    f"Значок верифицированного дилера повышает доверие покупателей."
                )
                button = ("Открыть профиль", profile_url)

            await _send_telegram_message(chat_id=chat_id, text=text, inline_button=button)

        # ------------------------------------------------------------------
        # support_reply
        # ------------------------------------------------------------------
        elif notification_type == "support_reply":
            reply_text = payload.get("text", "")
            support_url = f"{frontend_url}/support"
            text = f"<b>Ответ поддержки</b>\n\n{reply_text}"
            await _send_telegram_message(
                chat_id=chat_id,
                text=text,
                inline_button=("Открыть поддержку", support_url),
            )

        else:
            logger.warning("telegram_notifier: unknown notification_type '%s'", notification_type)

    except Exception as exc:
        logger.warning(
            "telegram_notifier failed for user %s (type=%s): %s",
            user_id,
            notification_type,
            exc,
        )
    finally:
        db.close()


async def notify_admin_new_listing(
    car_name: str,
    listing_id: str,
    username: Optional[str],
    phone: Optional[str],
) -> None:
    """Send a Telegram notification to the admin/support chat when a listing is submitted for moderation."""
    chat_id = settings.support_telegram_chat_id
    if not chat_id:
        return

    user_line = f"\n<b>Пользователь:</b> {username}" if username else ""
    phone_line = f"\n<b>Телефон:</b> <code>{phone}</code>" if phone else ""

    text = (
        f"🚗 <b>Новое объявление на проверке</b>\n"
        f"<b>Авто:</b> {car_name}"
        f"{user_line}{phone_line}"
    )

    try:
        await _send_telegram_message(
            chat_id=chat_id,
            text=text,
            inline_button=("Открыть очередь", f"{settings.frontend_url}/moderator"),
        )
    except Exception as exc:
        logger.warning("notify_admin_new_listing failed: %s", exc)


async def notify_admin_new_user(
    name: Optional[str],
    phone: Optional[str],
    email: Optional[str],
    method: str = "phone",
) -> None:
    """Send a Telegram notification to the admin/support chat when a new user registers.

    Silently returns if SUPPORT_TELEGRAM_CHAT_ID is not configured.
    """
    chat_id = settings.support_telegram_chat_id
    if not chat_id:
        return

    METHOD_LABELS = {
        "phone":   "Телефон + пароль",
        "otp":     "SMS OTP",
        "email":   "Email",
        "google":  "Google OAuth",
        "telegram": "Telegram OTP",
    }
    method_label = METHOD_LABELS.get(method, method)

    name_line  = f"\n<b>Имя:</b> {name}" if name else ""
    phone_line = f"\n<b>Телефон:</b> <code>{phone}</code>" if phone else ""
    email_line = f"\n<b>Email:</b> {email}" if email else ""

    from datetime import datetime as _dt, timezone as _tz
    now_str = _dt.now(_tz.utc).strftime("%d.%m.%Y %H:%M UTC")

    text = (
        f"👤 <b>Новый пользователь зарегистрировался</b>\n"
        f"{name_line}{phone_line}{email_line}\n"
        f"<b>Способ:</b> {method_label}\n"
        f"<b>Время:</b> {now_str}"
    )

    try:
        await _send_telegram_message(
            chat_id=chat_id,
            text=text,
            inline_button=("Управление пользователями", f"{settings.frontend_url}/admin/users"),
        )
    except Exception as exc:
        logger.warning("notify_admin_new_user failed: %s", exc)
