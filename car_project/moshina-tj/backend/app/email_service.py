"""Email sending via Resend (resend.com).

In dev mode (no RESEND_API_KEY), emails are logged to stdout — nothing is sent.

Public API
----------
send_email_otp(to, code, purpose)                          — 6-digit OTP
send_listing_approved(to, car_name, url)                   — listing approved
send_listing_rejected(to, car_name, reason, url)           — listing rejected
send_welcome_email(to, name)                               — welcome
send_new_message_notification(to, sender, preview, url)    — new chat message
send_account_banned(to, reason)                            — account banned notification
send_dealer_verified(to, dealer_name, profile_url)         — dealer verification confirmed
send_password_changed(to)                                  — password change confirmation
"""
from __future__ import annotations

import html as _html_module
import logging
from typing import Optional


def _e(value: str) -> str:
    """Escape a user-controlled value for safe HTML interpolation."""
    return _html_module.escape(str(value), quote=True)


logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Design tokens
# ---------------------------------------------------------------------------
_BRAND_URL = "https://tajcar.tj"
_ACCENT    = "#c83808"
_BG        = "#f4f5f7"
_CARD      = "#ffffff"
_BORDER    = "#e8eaed"
_TEXT      = "#111827"
_BODY      = "#4b5563"
_MUTED     = "#9ca3af"
_SUCCESS   = "#16a34a"
_WARNING   = "#d97706"
_FONT      = "system-ui,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif"


# ---------------------------------------------------------------------------
# Shared HTML fragments
# ---------------------------------------------------------------------------

def _head(subject: str, preview: str = "") -> str:
    preview_text = f"<div style='display:none;max-height:0;overflow:hidden;'>{_e(preview)}</div>" if preview else ""
    return f"""\
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="color-scheme" content="light"/>
  <title>{_e(subject)}</title>
  <style>
    body{{margin:0;padding:0;background:{_BG};font-family:{_FONT};-webkit-text-size-adjust:100%;}}
    a{{color:{_ACCENT};}}
    @media(max-width:600px){{
      .wrap{{padding:16px 8px!important;}}
      .card{{border-radius:12px!important;}}
      .pad{{padding:28px 20px!important;}}
      .foot{{padding:16px 20px!important;}}
    }}
  </style>
</head>
<body>
{preview_text}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="background:{_BG};">
  <tr><td class="wrap" style="padding:40px 16px 56px;" align="center">
    <table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="max-width:560px;background:{_CARD};border-radius:16px;
                  box-shadow:0 1px 16px rgba(0,0,0,0.07);">"""


def _logo_row() -> str:
    return f"""\
      <tr>
        <td style="padding:24px 32px;border-bottom:1px solid {_BORDER};">
          <a href="{_BRAND_URL}" style="text-decoration:none;display:inline-flex;align-items:baseline;gap:2px;">
            <span style="font-size:20px;font-weight:900;color:{_ACCENT};letter-spacing:-0.02em;">TAJCAR</span><span style="font-size:20px;font-weight:900;color:{_TEXT};letter-spacing:-0.02em;">.TJ</span>
          </a>
        </td>
      </tr>"""


def _body_open(accent_bar: str = "") -> str:
    bar = f"border-top:3px solid {accent_bar};" if accent_bar else ""
    return f"""\
      <tr>
        <td class="pad" style="padding:36px 36px 40px;{bar}">"""


def _body_close() -> str:
    return """\
        </td>
      </tr>"""


def _footer() -> str:
    return f"""\
      <tr>
        <td class="foot" style="padding:20px 36px 24px;border-top:1px solid {_BORDER};">
          <p style="margin:0;font-size:12px;color:{_MUTED};text-align:center;line-height:1.8;">
            &copy; 2025 TajCar.tj &mdash; Авторынок Таджикистана<br/>
            <a href="{_BRAND_URL}" style="color:{_MUTED};text-decoration:none;">{_BRAND_URL}</a>
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>"""


def _h1(text: str) -> str:
    return (
        f'<h1 style="margin:0 0 12px;font-size:22px;font-weight:800;'
        f'color:{_TEXT};line-height:1.3;">{text}</h1>'
    )


def _p(text: str, style: str = "") -> str:
    return (
        f'<p style="margin:0 0 16px;font-size:15px;color:{_BODY};'
        f'line-height:1.7;{style}">{text}</p>'
    )


def _label(text: str, color: str = "") -> str:
    c = color or _MUTED
    return (
        f'<p style="margin:0 0 20px;font-size:11px;font-weight:700;'
        f'letter-spacing:0.1em;color:{c};text-transform:uppercase;">{text}</p>'
    )


def _btn(label: str, url: str) -> str:
    return f"""\
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="margin-top:28px;">
  <tr>
    <td>
      <a href="{url}"
         style="display:inline-block;background:{_ACCENT};color:#fff;
                font-size:14px;font-weight:700;text-decoration:none;
                padding:13px 28px;border-radius:8px;letter-spacing:0.01em;">
        {label}
      </a>
    </td>
  </tr>
</table>"""


def _info_row(label: str, value: str, last: bool = False) -> str:
    border = "" if last else f"border-bottom:1px solid {_BORDER};"
    return f"""\
<tr>
  <td style="padding:12px 16px;{border}font-size:13px;color:{_MUTED};width:40%;vertical-align:top;">{label}</td>
  <td style="padding:12px 16px;{border}font-size:13px;font-weight:600;color:{_TEXT};vertical-align:top;">{value}</td>
</tr>"""


def _note(text: str) -> str:
    return (
        f'<p style="margin:20px 0 0;font-size:13px;color:{_MUTED};line-height:1.6;">'
        f'{text}</p>'
    )


# ---------------------------------------------------------------------------
# Core send
# ---------------------------------------------------------------------------

def _send_email(to_email: str, subject: str, html: str) -> bool:
    from app.config import settings
    api_key   = settings.resend_api_key
    from_addr = settings.resend_from_email or "TajCar.tj <noreply@tajcar.tj>"

    if not api_key:
        logger.warning("[DEV MODE] Email to=%s subject=%s", to_email, subject)
        return True
    try:
        import resend  # type: ignore[import-untyped]
        resend.api_key = api_key
        resend.Emails.send({"from": from_addr, "to": to_email, "subject": subject, "html": html})
        logger.info("Email sent to=%s subject=%s", to_email, subject)
        return True
    except Exception:
        logger.exception("Resend failed to=%s subject=%s", to_email, subject)
        return False


# ---------------------------------------------------------------------------
# 1. OTP / Verification Code
# ---------------------------------------------------------------------------

def send_email_otp(to_email: str, code: str, purpose: str = "verify") -> bool:
    if purpose == "verify":
        subject  = f"Код подтверждения: {code}"
        preview  = f"Ваш код: {code} — действителен 10 минут"
        label    = "Подтверждение email"
        heading  = "Подтвердите адрес"
        body_txt = "Введите этот код на TajCar.tj, чтобы завершить регистрацию."
    elif purpose == "reset":
        subject  = f"Сброс пароля: {code}"
        preview  = f"Код для сброса пароля: {code}"
        label    = "Сброс пароля"
        heading  = "Сброс пароля"
        body_txt = (
            "Вы запросили сброс пароля на TajCar.tj. "
            "Введите код ниже. Если вы не делали этот запрос — проигнорируйте письмо."
        )
    else:
        subject  = f"Код входа: {code}"
        preview  = f"Ваш код для входа: {code}"
        label    = "Вход в аккаунт"
        heading  = "Код для входа"
        body_txt = "Введите этот код для входа в ваш аккаунт на TajCar.tj."

    # OTP digit boxes
    digit_cells = ""
    for i, ch in enumerate(code):
        if i > 0:
            digit_cells += '<td style="width:8px;"></td>'
        digit_cells += (
            f'<td style="width:52px;height:64px;text-align:center;vertical-align:middle;'
            f'background:#f9fafb;border:1.5px solid {_BORDER};border-radius:10px;'
            f'font-size:30px;font-weight:800;color:{_TEXT};font-family:ui-monospace,monospace;">'
            f'{ch}</td>'
        )

    html = (
        _head(subject, preview)
        + _logo_row()
        + _body_open()
        + f"""
{_label(label, _ACCENT)}
{_h1(heading)}
{_p(body_txt)}

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px;">
  <tr>{digit_cells}</tr>
</table>

<p style="margin:12px 0 0;font-size:13px;color:{_MUTED};line-height:1.6;">
  Действителен <strong style="color:{_TEXT};">10 минут</strong>.
  Никому не передавайте этот код.
</p>
"""
        + _body_close()
        + _footer()
    )

    return _send_email(to_email, subject, html)


# ---------------------------------------------------------------------------
# 2. Listing Approved
# ---------------------------------------------------------------------------

def send_listing_approved(to_email: str, car_name: str, listing_url: str) -> bool:
    car_name = _e(car_name)
    subject  = f"Объявление опубликовано — {car_name}"

    html = (
        _head(subject, "Ваше объявление прошло модерацию и теперь видно покупателям.")
        + _logo_row()
        + _body_open(accent_bar=_SUCCESS)
        + f"""
{_label("Статус объявления", _SUCCESS)}
{_h1("Объявление опубликовано")}
{_p(f"Ваше объявление <strong>{car_name}</strong> прошло модерацию и теперь видно всем покупателям.")}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="border:1px solid {_BORDER};border-radius:10px;margin:20px 0 0;">
  {_info_row("Автомобиль", car_name)}
  {_info_row("Статус", f'<span style="color:{_SUCCESS};font-weight:700;">&#10003;&nbsp;Активно</span>', last=True)}
</table>

{_btn("Открыть объявление &rarr;", listing_url)}
{_note("Поделитесь в Telegram или Instagram, чтобы продать быстрее.")}
"""
        + _body_close()
        + _footer()
    )

    return _send_email(to_email, subject, html)


# ---------------------------------------------------------------------------
# 3. Listing Rejected
# ---------------------------------------------------------------------------

def send_listing_rejected(
    to_email: str,
    car_name: str,
    reason: Optional[str],
    edit_url: str,
) -> bool:
    car_name = _e(car_name)
    subject  = f"Объявление отклонено — {car_name}"

    reason_block = ""
    if reason:
        reason_block = f"""\
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="margin-top:20px;border:1.5px solid #fde68a;border-radius:10px;background:#fffbeb;">
  <tr>
    <td style="padding:16px 18px;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.08em;
                color:{_WARNING};text-transform:uppercase;">Причина:</p>
      <p style="margin:0;font-size:14px;color:{_TEXT};line-height:1.6;">{_e(reason)}</p>
    </td>
  </tr>
</table>"""

    html = (
        _head(subject, "Ваше объявление не прошло модерацию. Исправьте и отправьте повторно.")
        + _logo_row()
        + _body_open(accent_bar=_WARNING)
        + f"""
{_label("Статус объявления", _WARNING)}
{_h1("Объявление отклонено")}
{_p(f"Ваше объявление <strong>{car_name}</strong> не прошло модерацию. Исправьте замечания и отправьте повторно.")}
{reason_block}
{_btn("Исправить объявление &rarr;", edit_url)}
{_note("Большинство объявлений принимаются после первой правки.")}
"""
        + _body_close()
        + _footer()
    )

    return _send_email(to_email, subject, html)


# ---------------------------------------------------------------------------
# 4. Welcome
# ---------------------------------------------------------------------------

def send_welcome_email(to_email: str, name: Optional[str] = None) -> bool:
    display_name = _e(name) if name else "Уважаемый пользователь"
    subject      = f"Добро пожаловать на TajCar.tj"

    html = (
        _head(subject, "Рады видеть вас на крупнейшем авторынке Таджикистана.")
        + _logo_row()
        + _body_open()
        + f"""
{_label("Регистрация завершена", _ACCENT)}
{_h1(f"Добро пожаловать, {display_name}!")}
{_p("Рады видеть вас на крупнейшем авторынке Таджикистана. Вот что вы можете делать прямо сейчас:")}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="border:1px solid {_BORDER};border-radius:10px;margin:4px 0 0;">
  {_info_row("Продажа", "Разместите авто бесплатно за 3 минуты")}
  {_info_row("Поиск", "Тысячи объявлений по всему Таджикистану")}
  {_info_row("Рассрочка", "Удобные условия покупки", last=True)}
</table>

{_btn(f"Перейти на TajCar.tj &rarr;", _BRAND_URL)}
"""
        + _body_close()
        + _footer()
    )

    return _send_email(to_email, subject, html)


# ---------------------------------------------------------------------------
# 5. New Message Notification
# ---------------------------------------------------------------------------

def send_new_message_notification(
    to_email: str,
    sender_name: Optional[str],
    message_preview: Optional[str],
    chat_url: str,
) -> bool:
    sender  = _e(sender_name) if sender_name else "Пользователь"
    subject = f"Новое сообщение от {sender} — TajCar.tj"

    preview_block = ""
    if message_preview:
        preview_block = f"""\
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="margin:16px 0 0;border-left:3px solid {_BORDER};padding-left:0;">
  <tr>
    <td style="padding:12px 16px;background:#f9fafb;border-radius:0 8px 8px 0;">
      <p style="margin:0;font-size:14px;color:{_BODY};line-height:1.6;">{_e(message_preview[:200])}</p>
    </td>
  </tr>
</table>"""

    html = (
        _head(subject, f"{sender}: {(message_preview or '')[:80]}")
        + _logo_row()
        + _body_open()
        + f"""
{_label("Новое сообщение")}
{_h1(f"{sender} написал вам")}
{preview_block}
{_btn("Ответить &rarr;", chat_url)}
"""
        + _body_close()
        + _footer()
    )

    return _send_email(to_email, subject, html)


# ---------------------------------------------------------------------------
# 6. Account Banned
# ---------------------------------------------------------------------------

def send_account_banned(to_email: str, reason: Optional[str] = None) -> bool:
    subject = "Ваш аккаунт заблокирован — TajCar.tj"

    reason_block = ""
    if reason:
        reason_block = f"""\
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="margin-top:20px;border:1.5px solid #fca5a5;border-radius:10px;background:#fff5f3;">
  <tr>
    <td style="padding:14px 18px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.08em;
                color:{_ACCENT};text-transform:uppercase;">Причина блокировки</p>
      <p style="margin:0;font-size:14px;color:{_TEXT};line-height:1.6;">{_e(reason)}</p>
    </td>
  </tr>
</table>"""

    html = (
        _head(subject)
        + _logo_row()
        + _body_open(accent_bar=_ACCENT)
        + f"""
{_label("Аккаунт заблокирован", _ACCENT)}
{_h1("Ваш аккаунт заблокирован")}
{_p("Ваш аккаунт на TajCar.tj был заблокирован администрацией. Публикация объявлений и вход на сайт временно недоступны.")}
{_p(f'Если вы считаете, что это ошибка — <a href="{_BRAND_URL}/support">обратитесь в поддержку</a>.')}
{reason_block}
"""
        + _body_close()
        + _footer()
    )

    return _send_email(to_email, subject, html)


# ---------------------------------------------------------------------------
# 7. Dealer Verified
# ---------------------------------------------------------------------------

def send_dealer_verified(to_email: str, dealer_name: str, profile_url: str) -> bool:
    dealer_name = _e(dealer_name)
    subject     = "Дилерский аккаунт верифицирован — TajCar.tj"

    html = (
        _head(subject, "Значок верифицированного дилера теперь отображается на вашем профиле.")
        + _logo_row()
        + _body_open(accent_bar=_SUCCESS)
        + f"""
{_label("Верификация пройдена", _SUCCESS)}
{_h1(f"Поздравляем, {dealer_name}!")}
{_p("Ваш дилерский профиль на TajCar.tj успешно верифицирован. Значок верифицированного дилера повышает доверие покупателей.")}
{_btn("Открыть профиль дилера &rarr;", profile_url)}
"""
        + _body_close()
        + _footer()
    )

    return _send_email(to_email, subject, html)


# ---------------------------------------------------------------------------
# 8. Password Changed
# ---------------------------------------------------------------------------

def send_password_changed(to_email: str) -> bool:
    subject = "Пароль изменён — TajCar.tj"

    html = (
        _head(subject, "Пароль от вашего аккаунта был успешно изменён.")
        + _logo_row()
        + _body_open(accent_bar=_ACCENT)
        + f"""
{_label("Безопасность аккаунта")}
{_h1("Пароль успешно изменён")}
{_p("Пароль от вашего аккаунта на TajCar.tj был изменён.")}
{_p(f'Если это были не вы — немедленно <a href="{_BRAND_URL}/support">обратитесь в поддержку</a>, чтобы защитить аккаунт.')}
"""
        + _body_close()
        + _footer()
    )

    return _send_email(to_email, subject, html)
