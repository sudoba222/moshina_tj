import os
from pathlib import Path

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.limiter import limiter
from app.routers import admin, ai, auth, catalog, dealers, listings, search, upload, users
from app.routers.stats import router as stats_router
from app.routers.chat import router as chat_router, ws_router as chat_ws_router
from app.routers.notifications import router as notifications_router
from app.routers.subscriptions import router as subscriptions_router
from app.routers.support import router as support_router
from app.routers.telegram_webhook import router as telegram_router
from app.database import SessionLocal
from app.models import User, UserRole
from app.auth import hash_password

_IS_PRODUCTION = os.getenv("ENVIRONMENT", "development").lower() == "production"

app = FastAPI(
    title="MOSHINA.TJ API",
    version="1.0.0",
    description="Car marketplace API for Tajikistan",
    docs_url=None if _IS_PRODUCTION else "/docs",
    redoc_url=None if _IS_PRODUCTION else "/redoc",
    openapi_url=None if _IS_PRODUCTION else "/openapi.json",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ---------------------------------------------------------------------------
# Security headers middleware
# ---------------------------------------------------------------------------

@app.middleware("http")
async def add_security_headers(request: Request, call_next) -> Response:
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "img-src 'self' res.cloudinary.com data: blob:; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "connect-src 'self'; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self'"
    )
    if _IS_PRODUCTION:
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
origins = [origin.strip() for origin in settings.allowed_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth.router, prefix="/api/v1")
app.include_router(listings.router, prefix="/api/v1")
app.include_router(dealers.router, prefix="/api/v1")
app.include_router(search.router, prefix="/api/v1")
app.include_router(upload.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")
app.include_router(catalog.router, prefix="/api/v1")
app.include_router(stats_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(subscriptions_router, prefix="/api/v1")
app.include_router(support_router, prefix="/api/v1")
app.include_router(chat_ws_router)        # WebSocket — no /api/v1 prefix (WS handshake)
app.include_router(telegram_router)


# ---------------------------------------------------------------------------
# Static files (local image uploads — replaces Cloudinary for local dev)
# ---------------------------------------------------------------------------
UPLOADS_DIR = Path(__file__).resolve().parents[1] / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


# ---------------------------------------------------------------------------
# Startup: ensure staff accounts exist (idempotent)
# ---------------------------------------------------------------------------
_STAFF_ACCOUNTS = [
    {"phone": settings.admin_phone,     "name": "Admin",     "role": UserRole.admin},
    {"phone": settings.moderator_phone, "name": "Moderator", "role": UserRole.moderator},
    {"phone": settings.manager_phone,   "name": "Manager",   "role": UserRole.manager},
    {"phone": settings.support_phone,   "name": "Support",   "role": UserRole.support},
]

_DEFAULT_STAFF_PASSWORD = settings.staff_default_password
if not _DEFAULT_STAFF_PASSWORD:
    import logging as _logging
    _logging.getLogger(__name__).warning(
        "STAFF_DEFAULT_PASSWORD env var not set — staff accounts will NOT be seeded. "
        "Set this variable to a strong password before first boot."
    )

@app.on_event("startup")
def check_production_config() -> None:
    """Warn loudly if critical production settings are absent."""
    import logging as _logging
    _log = _logging.getLogger(__name__)

    if settings.environment == "production":
        missing = [
            name
            for name, value in [
                ("CLOUDINARY_CLOUD_NAME", settings.cloudinary_cloud_name),
                ("CLOUDINARY_API_KEY", settings.cloudinary_api_key),
                ("CLOUDINARY_API_SECRET", settings.cloudinary_api_secret),
            ]
            if not value
        ]
        if missing:
            _log.critical(
                "PRODUCTION STARTUP: Missing Cloudinary credentials: %s. "
                "Image uploads will fail with HTTP 503 until these are set. "
                "Set them in Render → Environment Variables and redeploy.",
                ", ".join(missing),
            )


@app.on_event("startup")
def seed_staff_accounts() -> None:
    """Create staff accounts on first boot if they don't exist yet."""
    if not _DEFAULT_STAFF_PASSWORD:
        return  # Refuse to seed with an empty password
    db = SessionLocal()
    try:
        for acc in _STAFF_ACCOUNTS:
            exists = db.query(User).filter(User.phone == acc["phone"]).first()
            if not exists:
                db.add(User(
                    phone=acc["phone"],
                    name=acc["name"],
                    password_hash=hash_password(_DEFAULT_STAFF_PASSWORD),
                    role=acc["role"],
                ))
        db.commit()
    except Exception:  # noqa: BLE001 — don't crash the server if seeding fails
        db.rollback()
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}
