from pydantic_settings import BaseSettings, SettingsConfigDict


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
    google_client_id: str = ""
    apple_client_id: str = ""

    allowed_origins: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
