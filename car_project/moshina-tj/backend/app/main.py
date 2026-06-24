import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

import sentry_sdk
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings

# ---------------------------------------------------------------------------
# Sentry — error tracking (only active in production)
# ---------------------------------------------------------------------------
_SENTRY_DSN = os.getenv("SENTRY_DSN", "")
if _SENTRY_DSN:
    sentry_sdk.init(
        dsn=_SENTRY_DSN,
        environment=os.getenv("ENVIRONMENT", "development"),
        traces_sample_rate=0.2,   # capture 20% of requests for performance tracing
        profiles_sample_rate=0.1,
        send_default_pii=False,   # never send passwords, tokens, or raw request bodies
    )
from app.limiter import limiter
from app.routers import admin, ai, auth, catalog, dealers, listings, search, upload, users
from app.routers.vin import router as vin_router
from app.routers.vehicles import router as vehicles_router
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
_log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Startup helpers
# ---------------------------------------------------------------------------

_STAFF_ACCOUNTS = [
    {"phone": settings.admin_phone,     "name": "Admin",     "role": UserRole.admin},
    {"phone": settings.moderator_phone, "name": "Moderator", "role": UserRole.moderator},
    {"phone": settings.manager_phone,   "name": "Manager",   "role": UserRole.manager},
    {"phone": settings.support_phone,   "name": "Support",   "role": UserRole.support},
]

_DEFAULT_STAFF_PASSWORD = settings.staff_default_password
if not _DEFAULT_STAFF_PASSWORD:
    _log.warning(
        "STAFF_DEFAULT_PASSWORD env var not set — staff accounts will NOT be seeded. "
        "Set this variable to a strong password before first boot."
    )


def _check_production_config() -> None:
    """Warn loudly if critical production settings are absent."""
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


def _seed_staff_accounts() -> None:
    """Create staff accounts on first boot if they don't exist yet."""
    if not _DEFAULT_STAFF_PASSWORD:
        return  # Refuse to seed with an empty password
    db = SessionLocal()
    try:
        for acc in _STAFF_ACCOUNTS:
            if not acc["phone"]:
                continue
            exists = db.query(User).filter(User.phone == acc["phone"]).first()
            if not exists:
                db.add(User(
                    phone=acc["phone"],
                    name=acc["name"],
                    password_hash=hash_password(_DEFAULT_STAFF_PASSWORD),
                    role=acc["role"],
                    phone_verified=True,
                    email_verified=True,  # Staff accounts bypass OTP flows
                ))
            else:
                # Backfill verified flags for accounts seeded before this fix
                if not exists.phone_verified or not exists.email_verified:
                    exists.phone_verified = True
                    exists.email_verified = True
        db.commit()
    except Exception:  # noqa: BLE001 — don't crash the server if seeding fails
        db.rollback()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup tasks then yield control to the application."""
    import asyncio as _asyncio
    from app.tasks import expire_old_drafts as _expire_drafts

    _check_production_config()
    _seed_staff_accounts()

    # Schedule background tasks — they run for the lifetime of the process.
    _draft_task = _asyncio.create_task(_expire_drafts())

    yield

    # Cancel background tasks on shutdown so they don't linger.
    _draft_task.cancel()
    try:
        await _draft_task
    except _asyncio.CancelledError:
        pass


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="TAJCAR.TJ API",
    version="1.0.0",
    description="Car marketplace API for Tajikistan",
    docs_url=None if _IS_PRODUCTION else "/docs",
    redoc_url=None if _IS_PRODUCTION else "/redoc",
    openapi_url=None if _IS_PRODUCTION else "/openapi.json",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ---------------------------------------------------------------------------
# CORS origins — defined here so the security headers middleware below can
# reference it before the CORSMiddleware is added further down.
# ---------------------------------------------------------------------------
origins = [origin.strip() for origin in settings.allowed_origins.split(",")]

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
    # Build connect-src to include all configured allowed origins + WebSocket variants
    _extra_connect = " ".join(
        o.replace("https://", "wss://").replace("http://", "ws://")
        for o in origins
        if o not in ("'self'", "*")
    )
    _connect_src = "'self' " + " ".join(origins) + (" " + _extra_connect if _extra_connect else "")
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "img-src 'self' res.cloudinary.com cdn.jsdelivr.net data: blob:; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        f"connect-src {_connect_src}; "
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
app.include_router(vehicles_router, prefix="/api/v1")
app.include_router(stats_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(subscriptions_router, prefix="/api/v1")
app.include_router(support_router, prefix="/api/v1")
app.include_router(chat_ws_router)        # WebSocket — no /api/v1 prefix (WS handshake)
app.include_router(telegram_router)
app.include_router(vin_router, prefix="/api/v1/vin")


# ---------------------------------------------------------------------------
# Static files (local image uploads — replaces Cloudinary for local dev)
# ---------------------------------------------------------------------------
UPLOADS_DIR = Path(__file__).resolve().parents[1] / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


# ---------------------------------------------------------------------------
# Health check — used by Coolify / load-balancer probes.
# Checks DB connectivity (SELECT 1) and Redis connectivity (PING).
# Returns HTTP 200 with individual component statuses so ops can diagnose
# partial failures without taking traffic away from healthy workers.
# ---------------------------------------------------------------------------
@app.get("/health", tags=["meta"])
async def health():
    import asyncio
    from app.redis_client import get_redis as _get_redis

    # --- Database ---
    db_status = "ok"
    try:
        from sqlalchemy import text as _text
        db = SessionLocal()
        try:
            db.execute(_text("SELECT 1"))
        finally:
            db.close()
    except Exception as exc:
        _log.warning("Health check: DB failed: %s", exc)
        db_status = "error"

    # --- Redis ---
    redis_status = "ok"
    try:
        client = await _get_redis()
        if client is None:
            redis_status = "unavailable"
        else:
            pong = await asyncio.wait_for(client.ping(), timeout=2.0)
            if not pong:
                redis_status = "error"
    except Exception as exc:
        _log.warning("Health check: Redis failed: %s", exc)
        redis_status = "error"

    overall = "ok" if db_status == "ok" else "degraded"
    return {"status": overall, "db": db_status, "redis": redis_status}
