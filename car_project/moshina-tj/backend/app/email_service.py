"""Email sending via Resend (resend.com).

In dev mode (no RESEND_API_KEY), codes are logged to stdout — no email is sent.
"""
import logging
import os

logger = logging.getLogger(__name__)

_HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f2f4f7;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="400" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:16px;padding:40px;border:1px solid #e2e6ed;">
        <tr>
          <td align="center" style="padding-bottom:28px;">
            <span style="font-size:22px;font-weight:800;color:#c83808;letter-spacing:-0.03em;">TajCar</span>
            <span style="font-size:13px;font-weight:700;color:#8a95a3;">.tj</span>
          </td>
        </tr>
        <tr>
          <td style="font-size:16px;font-weight:600;color:#191f28;padding-bottom:12px;">
            {title}
          </td>
        </tr>
        <tr>
          <td style="font-size:14px;color:#5a6473;line-height:1.6;padding-bottom:28px;">
            {body}
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-bottom:28px;">
            <div style="background:#f2f4f7;border-radius:12px;padding:20px 32px;display:inline-block;">
              <span style="font-size:36px;font-weight:800;letter-spacing:10px;color:#191f28;">{code}</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="font-size:12px;color:#8a95a3;text-align:center;">
            Код действителен 10 минут. Не передавайте его никому.
          </td>
        </tr>
        <tr>
          <td style="padding-top:28px;border-top:1px solid #e2e6ed;margin-top:24px;">
            <p style="font-size:12px;color:#8a95a3;text-align:center;margin:0;">
              © 2025 TajCar.tj — Авторынок Таджикистана
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""


def send_email_otp(to_email: str, code: str, purpose: str = "verify") -> bool:
    """Send a 6-digit OTP to the given email address.

    Args:
        to_email: recipient email
        code: 6-digit OTP string
        purpose: "verify" (email verification) or "login" (future use)

    Returns:
        True if sent (or logged in dev mode), False on error.
    """
    api_key = os.getenv("RESEND_API_KEY", "")
    from_addr = os.getenv("RESEND_FROM_EMAIL", "TajCar.tj <noreply@tajcar.tj>")

    if purpose == "verify":
        subject = f"Ваш код подтверждения: {code}"
        title = "Подтвердите ваш email"
        body = (
            "Введите этот код на сайте TajCar.tj, чтобы подтвердить "
            "ваш адрес электронной почты и завершить регистрацию."
        )
    else:
        subject = f"Код входа TajCar.tj: {code}"
        title = "Вход в аккаунт"
        body = "Введите этот код, чтобы войти в ваш аккаунт на TajCar.tj."

    html = _HTML_TEMPLATE.format(title=title, body=body, code=code)

    if not api_key:
        logger.warning(
            "[DEV MODE] Email OTP for %s | code=%s | subject=%s",
            to_email,
            code,
            subject,
        )
        return True

    try:
        import resend  # type: ignore[import-untyped]

        resend.api_key = api_key
        resend.Emails.send(
            {
                "from": from_addr,
                "to": to_email,
                "subject": subject,
                "html": html,
            }
        )
        return True
    except Exception:
        logger.exception("Resend email failed to %s", to_email)
        return False
