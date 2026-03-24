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
    title="TajCar.tj API",
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
    {"phone": "+992900000003", "name": "Admin Moshina",     "role": UserRole.admin},
    {"phone": "+992900000004", "name": "Moderator Moshina", "role": UserRole.moderator},
    {"phone": "+992900000005", "name": "Manager Moshina",   "role": UserRole.manager},
    {"phone": "+992900000006", "name": "Support Moshina",   "role": UserRole.support},
]
_DEFAULT_STAFF_PASSWORD = "tajcar123"

@app.on_event("startup")
def seed_staff_accounts() -> None:
    """Create staff accounts on first boot if they don't exist yet."""
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
                    is_active=True,
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
