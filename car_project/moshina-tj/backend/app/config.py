import logging

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_config_logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days
    environment: str = "development"  # "production" | "staging" | "development"

    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""

    anthropic_api_key: str = ""
    groq_api_key: str = ""
    resend_api_key: str = ""
    resend_from_email: str = ""
    telegram_bot_token: str = ""
    telegram_bot_username: str = ""
    telegram_webhook_secret: str = ""
    support_telegram_chat_id: str = ""  # admin/support Telegram chat ID for support relay
    google_client_id: str = ""
    google_client_secret: str = ""
    apple_client_id: str = ""
    apple_client_secret: str = ""

    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""  # E.164 format or Alphanumeric Sender ID e.g. "TajCar"

    unimtx_api_key: str = ""
    unimtx_sender_id: str = "TajCar"

    frontend_url: str = "http://localhost:3000"
    google_redirect_uri: str = "http://localhost:8000/api/v1/auth/google/callback"

    # Staff account seeding — intentionally empty; set these in .env for each environment
    staff_default_password: str = ""
    admin_phone: str = ""
    moderator_phone: str = ""
    manager_phone: str = ""
    support_phone: str = ""

    allowed_origins: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @model_validator(mode="after")
    def _validate_secret_key(self) -> "Settings":
        if len(self.secret_key) < 32:
            raise ValueError(
                "SECRET_KEY must be at least 32 characters. "
                "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        return self

    @model_validator(mode="after")
    def _warn_dev_mode_on_non_localhost(self) -> "Settings":
        """Warn loudly if environment is 'development' on a non-localhost server.

        This prevents OTP codes from leaking in API responses on staging servers
        that forgot to set ENVIRONMENT=production or ENVIRONMENT=staging.
        """
        if self.environment == "development":
            host = self.frontend_url.lower()
            if "localhost" not in host and "127.0.0.1" not in host:
                _config_logger.critical(
                    "SECURITY WARNING: ENVIRONMENT is set to 'development' but "
                    "FRONTEND_URL (%s) does not look like localhost. "
                    "OTP codes will be returned in plaintext API responses. "
                    "Set ENVIRONMENT=production or ENVIRONMENT=staging in your .env file.",
                    self.frontend_url,
                )
        return self

    @model_validator(mode="after")
    def _warn_empty_staff_phones(self) -> "Settings":
        if self.environment != "development":
            for field in ("admin_phone", "moderator_phone", "manager_phone", "support_phone"):
                if not getattr(self, field):
                    _config_logger.warning(
                        "Config warning: %s is not set in environment '%s'. "
                        "Staff seeding will skip this role.",
                        field,
                        self.environment,
                    )
        return self


settings = Settings()
