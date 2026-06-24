"""Firebase Cloud Messaging helper.

Sends push notifications to mobile devices via FCM HTTP v1 API.

Configuration:
    Set FIREBASE_CREDENTIALS_JSON in .env to the full contents of the
    Firebase service account JSON file (as a single-line string).

If FIREBASE_CREDENTIALS_JSON is not set, send_push() is a silent no-op so
the application starts and runs normally without FCM configured.
"""
import json
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Lazy singleton — initialised once on first call so startup time is unaffected
# when FCM is not configured.
_messaging_client: Any = None
_init_attempted: bool = False


def _get_messaging():
    """Return the firebase_admin Messaging app, or None if not configured."""
    global _messaging_client, _init_attempted
    if _init_attempted:
        return _messaging_client
    _init_attempted = True

    from app.config import settings
    raw = settings.firebase_credentials_json.strip()
    if not raw:
        logger.debug("FCM: FIREBASE_CREDENTIALS_JSON not set — push notifications disabled")
        return None

    try:
        import firebase_admin
        from firebase_admin import credentials as _creds, messaging as _messaging

        cred_dict = json.loads(raw)
        cred = _creds.Certificate(cred_dict)
        # Initialise only once — firebase_admin raises an error on double-init
        try:
            app = firebase_admin.get_app()
        except ValueError:
            app = firebase_admin.initialize_app(cred)

        _messaging_client = _messaging
        logger.info("FCM: firebase_admin initialised successfully")
    except Exception:
        logger.exception("FCM: failed to initialise firebase_admin — push notifications disabled")
        _messaging_client = None

    return _messaging_client


def send_push(
    token: str,
    *,
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> bool:
    """Send a push notification to a single FCM registration token.

    Args:
        token:  FCM device registration token stored in users.fcm_token
        title:  Notification title (shown in system tray)
        body:   Notification body text
        data:   Optional key-value payload delivered alongside the notification

    Returns:
        True on success, False if FCM is not configured or the send fails.
    """
    messaging = _get_messaging()
    if messaging is None:
        return False

    if not token or not token.strip():
        return False

    # FCM data values must all be strings
    str_data: dict[str, str] = {}
    if data:
        str_data = {k: str(v) for k, v in data.items()}

    try:
        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data=str_data or None,
            token=token.strip(),
        )
        response = messaging.send(message)
        logger.debug("FCM: sent message_id=%s token=...%s", response, token[-6:])
        return True
    except Exception:
        logger.exception("FCM: failed to send push to token=...%s", token[-6:] if token else "")
        return False
