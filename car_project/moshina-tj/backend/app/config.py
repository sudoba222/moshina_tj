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
    resend_api_key: str = ""
    resend_from_email: str = ""
    telegram_bot_token: str = ""
    telegram_bot_username: str = ""
    telegram_webhook_secret: str = ""
    google_client_id: str = ""
    google_client_secret: str = ""
    apple_client_id: str = ""
    apple_client_secret: str = ""

    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""

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
