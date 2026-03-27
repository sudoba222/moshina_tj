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

import base64
import html as _html_module
import logging
from typing import Optional


def _e(value: str) -> str:
    """Escape a user-controlled value for safe HTML interpolation."""
    return _html_module.escape(str(value), quote=True)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Brand tokens
# ---------------------------------------------------------------------------
_BRAND_URL    = "https://tajcar.tj"
_ACCENT       = "#c83808"
_BG           = "#f0f2f5"
_CARD         = "#ffffff"
_BORDER       = "#e3e7ef"
_TEXT         = "#141920"
_BODY         = "#4a5568"
_MUTED        = "#8a93a3"
_SUCCESS      = "#16a34a"
_SUCCESS_BG   = "#f0fdf4"
_SUCCESS_BD   = "#bbf7d0"
_WARN_BG      = "#fffbeb"
_WARN_BD      = "#fde68a"
_WARN_TEXT    = "#92400e"
_ERROR_BG     = "#fff5f3"
_ERROR_BD     = "#fca5a5"
_FONT         = "'Syne', system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"

# ---------------------------------------------------------------------------
# Inline SVG logo — base64 data URI so it always renders regardless of domain
# ---------------------------------------------------------------------------
_SVG_LOGO = '''<svg xmlns="http://www.w3.org/2000/svg" width="160" height="40" viewBox="0 0 160 40">
  <text x="0" y="30" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="32" fill="#c83808">TAJ</text>
  <text x="68" y="30" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="32" fill="#141920">CAR</text>
  <text x="138" y="30" font-family="Arial Black,Arial,sans-serif" font-weight="700" font-size="20" fill="#8a93a3">.TJ</text>
</svg>'''

_LOGO_DATA_URI = "data:image/svg+xml;base64," + base64.b64encode(_SVG_LOGO.encode()).decode()


# ---------------------------------------------------------------------------
# Shared HTML fragments
# ---------------------------------------------------------------------------

def _html_head(subject: str) -> str:
    return f"""\
<!DOCTYPE html>
<html lang="ru" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="color-scheme" content="light"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <title>{subject}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&display=swap" rel="stylesheet"/>
  <style>
    @media only screen and (max-width:600px) {{
      .card {{ border-radius:0!important; }}
      .body-pad {{ padding:24px 20px!important; }}
      .foot-pad {{ padding:16px 20px!important; }}
      .digit-td {{ width:40px!important; height:52px!important; font-size:26px!important; border-radius:8px!important; }}
      .digit-gap {{ width:5px!important; }}
      .cta-btn {{ display:block!important; text-align:center!important; }}
    }}
  </style>
</head>
<body style="margin:0;padding:0;background:{_BG};-webkit-text-size-adjust:100%;font-family:{_FONT};">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">{subject}&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="background:{_BG};padding:40px 0 56px;">
  <tr><td align="center" style="padding:0 16px;">"""


def _html_card_open(top_border_color: str = "") -> str:
    border_style = (
        f"border-top:4px solid {top_border_color};"
        if top_border_color else ""
    )
    return f"""\
    <table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="max-width:580px;background:{_CARD};border-radius:16px;{border_style}
                  box-shadow:0 2px 24px rgba(20,25,32,0.09);overflow:hidden;">

      <!-- LOGO HEADER -->
      <tr>
        <td style="padding:28px 32px;border-bottom:1px solid {_BORDER};text-align:center;">
          <a href="{_BRAND_URL}" style="text-decoration:none;display:inline-block;">
            <img src="{_LOGO_DATA_URI}" width="160" height="40" alt="TajCar.tj"
                 style="display:block;border:0;"/>
          </a>
        </td>
      </tr>

      <!-- BODY -->
      <tr>
        <td class="body-pad" style="padding:32px 36px 36px;">"""


def _html_card_close() -> str:
    return f"""\
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td class="foot-pad"
            style="padding:18px 36px 22px;border-top:1px solid {_BORDER};">
          <p style="margin:0;font-size:12px;color:{_MUTED};text-align:center;
                    line-height:1.7;font-family:{_FONT};">
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


def _html_cta_button(label: str, url: str) -> str:
    return f"""\
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="margin-top:28px;">
  <tr>
    <td align="center">
      <a href="{url}" class="cta-btn"
         style="display:inline-block;background:{_ACCENT};color:#ffffff;
                font-family:{_FONT};font-size:15px;font-weight:700;
                text-decoration:none;padding:14px 32px;border-radius:10px;
                letter-spacing:0.01em;line-height:1;">
        {label}
      </a>
    </td>
  </tr>
</table>"""


def _html_h1(text: str) -> str:
    return (
        f'<h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:{_TEXT};'
        f'line-height:1.3;font-family:{_FONT};">{text}</h1>'
    )


def _html_p(text: str) -> str:
    return (
        f'<p style="margin:0 0 0;font-size:15px;color:{_BODY};line-height:1.7;'
        f'font-family:{_FONT};">{text}</p>'
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
        subject = f"Ваш код подтверждения: {code}"
        title   = "Подтвердите email"
        intro   = (
            "Введите этот код на сайте TajCar.tj, чтобы подтвердить "
            "ваш адрес электронной почты и завершить регистрацию."
        )
    elif purpose == "reset":
        subject = f"Сброс пароля: {code}"
        title   = "Сброс пароля"
        intro   = (
            "Вы запросили сброс пароля на TajCar.tj. "
            "Введите код ниже для подтверждения. "
            "Если вы не делали этот запрос — просто проигнорируйте письмо."
        )
    else:
        subject = f"Код входа: {code}"
        title   = "Код входа"
        intro   = "Введите этот код, чтобы войти в ваш аккаунт на TajCar.tj."

    # Individual digit boxes — one <td> per digit, gap between each
    digit_cells = ""
    for i, ch in enumerate(code):
        if i > 0:
            digit_cells += '<td class="digit-gap" style="width:8px;"></td>'
        digit_cells += (
            f'<td class="digit-td" '
            f'style="width:48px;height:60px;text-align:center;vertical-align:middle;'
            f'background:#f7f8fa;border:1.5px solid {_BORDER};border-radius:10px;'
            f'font-size:28px;font-weight:800;color:{_TEXT};font-family:Courier New,monospace;">'
            f'{ch}</td>'
        )

    html = (
        _html_head(subject)
        + _html_card_open()
        + f"""
          <!-- Lock icon circle -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"
                 style="margin:0 0 20px;">
            <tr>
              <td style="width:48px;height:48px;border-radius:50%;
                         background:#eff6ff;border:2px solid #bfdbfe;
                         text-align:center;vertical-align:middle;">
                <!-- lock body -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0"
                       style="margin:0 auto;">
                  <tr>
                    <td>
                      <div style="width:14px;height:10px;background:#3b82f6;
                                  border-radius:2px;margin:0 auto;"></div>
                      <div style="width:10px;height:8px;border:2px solid #3b82f6;
                                  border-bottom:none;border-radius:5px 5px 0 0;
                                  margin:0 auto 0;"></div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          {_html_h1(title)}
          <p style="margin:0 0 28px;font-size:15px;color:{_BODY};line-height:1.7;
                    font-family:{_FONT};">{intro}</p>

          <!-- Digit boxes -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"
                 style="margin:0 0 8px;">
            <tr>
              {digit_cells}
            </tr>
          </table>

          <!-- Expiry notice -->
          <p style="margin:16px 0 0;font-size:13px;color:{_MUTED};
                    font-family:{_FONT};line-height:1.6;">
            Действителен <strong style="color:{_TEXT};">10 минут</strong>
            &nbsp;&middot;&nbsp;Никому не передавайте
          </p>
"""
        + _html_card_close()
    )

    return _send_email(to_email, subject, html)


# ---------------------------------------------------------------------------
# 2. Listing Approved
# ---------------------------------------------------------------------------

def send_listing_approved(to_email: str, car_name: str, listing_url: str) -> bool:
    car_name = _e(car_name)
    subject = f"Объявление опубликовано — {car_name}"

    html = (
        _html_head(subject)
        + _html_card_open(top_border_color=_SUCCESS)
        + f"""
          <!-- Checkmark icon circle -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"
                 style="margin:0 0 20px;">
            <tr>
              <td style="width:48px;height:48px;border-radius:50%;
                         background:{_SUCCESS_BG};border:2px solid {_SUCCESS_BD};
                         text-align:center;vertical-align:middle;">
                <span style="font-size:22px;color:{_SUCCESS};font-weight:700;line-height:1;">&#10003;</span>
              </td>
            </tr>
          </table>

          {_html_h1("Объявление опубликовано!")}
          <p style="margin:0 0 24px;font-size:15px;color:{_BODY};line-height:1.7;
                    font-family:{_FONT};">
            Ваше объявление успешно прошло модерацию и теперь видно всем покупателям.
          </p>

          <!-- Info table -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="background:{_BG};border-radius:10px;border:1px solid {_BORDER};
                        margin:0 0 4px;">
            <tr>
              <td style="padding:14px 18px;border-bottom:1px solid {_BORDER};
                         font-size:13px;color:{_MUTED};font-family:{_FONT};width:40%;">
                Автомобиль
              </td>
              <td style="padding:14px 18px;border-bottom:1px solid {_BORDER};
                         font-size:14px;font-weight:700;color:{_TEXT};font-family:{_FONT};">
                {car_name}
              </td>
            </tr>
            <tr>
              <td style="padding:14px 18px;font-size:13px;color:{_MUTED};font-family:{_FONT};">
                Статус
              </td>
              <td style="padding:14px 18px;font-size:14px;font-family:{_FONT};">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;
                             background:{_SUCCESS};margin-right:6px;vertical-align:middle;"></span>
                <span style="color:{_SUCCESS};font-weight:700;">Активно</span>
              </td>
            </tr>
          </table>

          {_html_cta_button("Открыть объявление &rarr;", listing_url)}

          <p style="margin:18px 0 0;font-size:13px;color:{_MUTED};text-align:center;
                    font-family:{_FONT};">
            Поделитесь в Telegram или Instagram, чтобы продать быстрее
          </p>
"""
        + _html_card_close()
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
    subject = f"Объявление отклонено — {car_name}"

    reason_block = ""
    if reason:
        reason = _e(reason)
        reason_block = f"""\
          <!-- Reason box -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="margin:20px 0 0;background:{_ERROR_BG};border:1.5px solid {_ERROR_BD};
                        border-radius:12px;">
            <tr>
              <td style="padding:16px 20px;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.08em;
                           color:{_ACCENT};font-family:{_FONT};text-transform:uppercase;">
                  Причина:
                </p>
                <p style="margin:0;font-size:14px;color:{_TEXT};line-height:1.6;
                           font-family:{_FONT};">
                  {reason}
                </p>
              </td>
            </tr>
          </table>"""

    html = (
        _html_head(subject)
        + _html_card_open(top_border_color="#f59e0b")
        + f"""
          <!-- Warning icon circle -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"
                 style="margin:0 0 20px;">
            <tr>
              <td style="width:48px;height:48px;border-radius:50%;
                         background:{_WARN_BG};border:2px solid {_WARN_BD};
                         text-align:center;vertical-align:middle;">
                <span style="font-size:22px;color:#f59e0b;font-weight:700;line-height:1;">!</span>
              </td>
            </tr>
          </table>

          {_html_h1("Объявление отклонено")}
          <p style="margin:0;font-size:15px;color:{_BODY};line-height:1.7;
                    font-family:{_FONT};">
            К сожалению, ваше объявление <strong style="color:{_TEXT};">{car_name}</strong>
            не прошло модерацию. Исправьте указанные замечания и отправьте повторно.
          </p>

          {reason_block}

          {_html_cta_button("Исправить объявление &rarr;", edit_url)}

          <p style="margin:18px 0 0;font-size:13px;color:{_MUTED};text-align:center;
                    font-family:{_FONT};">
            Большинство объявлений принимаются после первой правки
          </p>
"""
        + _html_card_close()
    )

    return _send_email(to_email, subject, html)


# ---------------------------------------------------------------------------
# 4. Welcome
# ---------------------------------------------------------------------------

def send_welcome_email(to_email: str, name: Optional[str] = None) -> bool:
    display_name = _e(name) if name else "водитель"
    subject = f"Добро пожаловать на TajCar.tj, {display_name}!"

    html = (
        _html_head(subject)
        + _html_card_open()
        + f"""
          <!-- Brand icon circle -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"
                 style="margin:0 0 20px;">
            <tr>
              <td style="width:52px;height:52px;border-radius:50%;
                         background:{_ACCENT};text-align:center;vertical-align:middle;">
                <span style="font-size:26px;line-height:1;">&#x1F697;</span>
              </td>
            </tr>
          </table>

          {_html_h1(f"Добро пожаловать, {display_name}!")}
          <p style="margin:0 0 28px;font-size:15px;color:{_BODY};line-height:1.7;
                    font-family:{_FONT};">
            Рады видеть вас на крупнейшем авторынке Таджикистана.
            Вот что вы можете делать прямо сейчас:
          </p>

          <!-- Feature rows -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

            <tr>
              <td style="padding:0 0 12px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                       style="background:{_BG};border-radius:10px;">
                  <tr>
                    <td style="width:44px;padding:14px 0 14px 14px;vertical-align:middle;">
                      <div style="width:32px;height:32px;border-radius:8px;
                                  background:{_ACCENT};"></div>
                    </td>
                    <td style="padding:14px 16px;vertical-align:middle;">
                      <p style="margin:0 0 2px;font-size:14px;font-weight:700;
                                 color:{_TEXT};font-family:{_FONT};">Продажа</p>
                      <p style="margin:0;font-size:13px;color:{_BODY};font-family:{_FONT};">
                        Разместите авто бесплатно за 3 минуты
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:0 0 12px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                       style="background:{_BG};border-radius:10px;">
                  <tr>
                    <td style="width:44px;padding:14px 0 14px 14px;vertical-align:middle;">
                      <div style="width:32px;height:32px;border-radius:8px;
                                  background:#3b82f6;"></div>
                    </td>
                    <td style="padding:14px 16px;vertical-align:middle;">
                      <p style="margin:0 0 2px;font-size:14px;font-weight:700;
                                 color:{_TEXT};font-family:{_FONT};">Поиск</p>
                      <p style="margin:0;font-size:13px;color:{_BODY};font-family:{_FONT};">
                        Тысячи объявлений по всему Таджикистану
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                       style="background:{_BG};border-radius:10px;">
                  <tr>
                    <td style="width:44px;padding:14px 0 14px 14px;vertical-align:middle;">
                      <div style="width:32px;height:32px;border-radius:8px;
                                  background:{_SUCCESS};"></div>
                    </td>
                    <td style="padding:14px 16px;vertical-align:middle;">
                      <p style="margin:0 0 2px;font-size:14px;font-weight:700;
                                 color:{_TEXT};font-family:{_FONT};">Рассрочка</p>
                      <p style="margin:0;font-size:13px;color:{_BODY};font-family:{_FONT};">
                        Удобные условия покупки в рассрочку
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

          </table>

          {_html_cta_button(f"Перейти на TajCar.tj &rarr;", _BRAND_URL)}
"""
        + _html_card_close()
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

    # First letter of sender name for avatar circle (escape after slicing)
    avatar_letter = _e(sender[0].upper()) if sender else "П"

    preview_block = ""
    if message_preview:
        safe_preview = _e(message_preview[:200])
        preview_block = f"""\
          <!-- Chat bubble -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="margin:20px 0 0;">
            <tr>
              <td style="background:#f3f4f6;border-radius:4px 16px 16px 16px;
                         padding:14px 16px;">
                <p style="margin:0;font-size:14px;color:{_BODY};line-height:1.6;
                           font-family:{_FONT};">
                  {safe_preview}
                </p>
              </td>
            </tr>
          </table>"""

    html = (
        _html_head(subject)
        + _html_card_open()
        + f"""
          <!-- Sender avatar -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"
                 style="margin:0 0 16px;">
            <tr>
              <td style="width:52px;height:52px;border-radius:50%;
                         background:{_ACCENT};text-align:center;vertical-align:middle;">
                <span style="font-size:22px;font-weight:800;color:#ffffff;
                             font-family:{_FONT};line-height:1;">{avatar_letter}</span>
              </td>
            </tr>
          </table>

          <p style="margin:0 0 4px;font-size:12px;color:{_MUTED};
                    font-family:{_FONT};letter-spacing:0.04em;">
            НОВОЕ СООБЩЕНИЕ
          </p>
          {_html_h1(f"{sender} написал вам")}

          {preview_block}

          {_html_cta_button("Ответить &rarr;", chat_url)}
"""
        + _html_card_close()
    )

    return _send_email(to_email, subject, html)


# ---------------------------------------------------------------------------
# 6. Account banned
#    Warning tone — no CTA button, just support link text
# ---------------------------------------------------------------------------

def send_account_banned(to_email: str, reason: Optional[str] = None) -> bool:
    subject = "Ваш аккаунт заблокирован — TajCar.tj"

    reason_block = ""
    if reason:
        reason = _e(reason)
        reason_block = f"""\
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="margin-top:20px;background:{_ERROR_BG};border:1.5px solid {_ERROR_BD};border-radius:10px;">
  <tr>
    <td style="padding:14px 18px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:{_MUTED};
                text-transform:uppercase;letter-spacing:0.1em;font-family:{_FONT};">
        Причина блокировки
      </p>
      <p style="margin:0;font-size:14px;color:{_TEXT};line-height:1.6;font-family:{_FONT};">
        {reason}
      </p>
    </td>
  </tr>
</table>"""

    html = (
        _html_head(subject)
        + _html_card_open(top_border_color=_ACCENT)
        + f"""
{_html_h1("Ваш аккаунт заблокирован")}
<p style="margin:12px 0 0;font-size:15px;color:{_BODY};line-height:1.7;font-family:{_FONT};">
  Ваш аккаунт на TajCar.tj был заблокирован администрацией. Во время блокировки
  вы не можете публиковать объявления или входить на сайт.
</p>
<p style="margin:12px 0 0;font-size:15px;color:{_BODY};line-height:1.7;font-family:{_FONT};">
  Если вы считаете, что это ошибка, обратитесь в службу поддержки:&nbsp;
  <a href="{_BRAND_URL}/support" style="color:{_ACCENT};text-decoration:none;font-weight:600;">
    tajcar.tj/support
  </a>
</p>
{reason_block}
"""
        + _html_card_close()
    )

    return _send_email(to_email, subject, html)


# ---------------------------------------------------------------------------
# 7. Dealer verified
#    Success tone — green badge, single CTA to dealer profile
# ---------------------------------------------------------------------------

def send_dealer_verified(to_email: str, dealer_name: str, profile_url: str) -> bool:
    dealer_name = _e(dealer_name)
    subject = "Ваш дилерский аккаунт верифицирован — TajCar.tj"

    verified_badge = f"""\
<table role="presentation" cellpadding="0" cellspacing="0" border="0"
       style="margin-bottom:20px;background:{_SUCCESS_BG};border:1.5px solid {_SUCCESS_BD};
              border-radius:10px;width:100%;">
  <tr>
    <td style="padding:12px 18px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="width:10px;height:10px;border-radius:50%;background:{_SUCCESS};
                     vertical-align:middle;"></td>
          <td style="padding-left:10px;font-size:14px;font-weight:700;color:{_SUCCESS};
                     font-family:{_FONT};vertical-align:middle;">
            Верификация пройдена
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>"""

    html = (
        _html_head(subject)
        + _html_card_open(top_border_color=_SUCCESS)
        + f"""
{verified_badge}
{_html_h1(f"Поздравляем, {dealer_name}!")}
<p style="margin:12px 0 0;font-size:15px;color:{_BODY};line-height:1.7;font-family:{_FONT};">
  Ваш дилерский профиль на TajCar.tj успешно верифицирован. Теперь рядом с вашим
  профилем отображается значок верифицированного дилера — это повышает доверие покупателей.
</p>
<p style="margin:12px 0 0;font-size:15px;color:{_BODY};line-height:1.7;font-family:{_FONT};">
  Откройте ваш профиль, чтобы убедиться, что всё отображается корректно.
</p>
{_html_cta_button("Открыть профиль дилера", profile_url)}
"""
        + _html_card_close()
    )

    return _send_email(to_email, subject, html)


# ---------------------------------------------------------------------------
# 8. Password changed confirmation
#    Security alert — single CTA to support if the user didn't initiate this
# ---------------------------------------------------------------------------

def send_password_changed(to_email: str) -> bool:
    subject = "Пароль изменён — TajCar.tj"

    html = (
        _html_head(subject)
        + _html_card_open(top_border_color=_ACCENT)
        + f"""
{_html_h1("Пароль успешно изменён")}
<p style="margin:12px 0 0;font-size:15px;color:{_BODY};line-height:1.7;font-family:{_FONT};">
  Пароль от вашего аккаунта на TajCar.tj был успешно изменён.
</p>
<p style="margin:12px 0 0;font-size:15px;color:{_BODY};line-height:1.7;font-family:{_FONT};">
  Если вы не производили это действие — немедленно обратитесь в поддержку, чтобы защитить
  ваш аккаунт.
</p>
{_html_cta_button("Обратиться в поддержку", f"{_BRAND_URL}/support")}
"""
        + _html_card_close()
    )

    return _send_email(to_email, subject, html)
