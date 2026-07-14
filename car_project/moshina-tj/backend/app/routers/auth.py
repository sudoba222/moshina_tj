import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr, field_validator
from app.limiter import limiter
from sqlalchemy.orm import Session

from app.config import settings
from app.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.database import get_db
from app.email_service import send_email_otp, send_welcome_email, send_password_changed
from app.models import Dealer, OtpCode, TelegramToken, User, UserRole, log_audit
from app.schemas import ApiResponse, AuthResponse, Token, UserCreate, UserResponse

logger = logging.getLogger(__name__)

_COOKIE_MAX_AGE_DEFAULT = 7 * 24 * 60 * 60    # 7 days in seconds
_COOKIE_MAX_AGE_REMEMBER = 7 * 24 * 60 * 60   # 7 days — matches JWT expiry


def _set_auth_cookie(response: Response, token: str, remember_me: bool = False) -> None:
    """Set the JWT as an HttpOnly cookie so XSS cannot steal it."""
    is_prod = settings.environment == "production"
    max_age = _COOKIE_MAX_AGE_REMEMBER if remember_me else _COOKIE_MAX_AGE_DEFAULT
    
    # In production, we usually want to share the cookie across subdomains.
    # But if we are on a platform like Vercel/Coolify with dynamic domains,
    # hardcoding '.tajcar.tj' might break other environments.
    domain = None
    if is_prod:
        # If the frontend is on a different domain than the backend, 
        # we MUST use samesite='none' and secure=True.
        # domain='.tajcar.tj' is only for production tajcar.tj
        if "tajcar.tj" in settings.frontend_url:
            domain = ".tajcar.tj"

    response.set_cookie(
        key="token",
        value=token,
        httponly=True,
        samesite="none" if is_prod else "lax",
        max_age=max_age,
        path="/",
        secure=is_prod,
        domain=domain,
    )


def _clear_auth_cookie(response: Response) -> None:
    is_prod = settings.environment == "production"
    response.delete_cookie(
        key="token",
        path="/",
        domain=".tajcar.tj" if is_prod else None,
    )


class ChangePasswordPayload(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def new_password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v) > 128:
            raise ValueError("Password must be at most 128 characters")
        return v


class UpdateProfilePayload(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    whatsapp_number: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_max_length(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if len(v) > 100:
                raise ValueError("Name must be at most 100 characters")
        return v

    @field_validator("whatsapp_number")
    @classmethod
    def whatsapp_number_max_length(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if len(v) > 50:
                raise ValueError("WhatsApp number must be at most 50 characters")
        return v or None

class SendOtpPayload(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def phone_valid(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith("+"):
            raise ValueError("Phone must start with '+'")
        if len(v) < 7 or len(v) > 20:
            raise ValueError("Phone length invalid")
        return v


class VerifyOtpPayload(BaseModel):
    phone: str
    code: str
    name: Optional[str] = None
    password: Optional[str] = None  # if provided, used as the new user's password
    is_dealer: bool = False
    dealership_name: Optional[str] = None

    @field_validator("code")
    @classmethod
    def code_length(cls, v: str) -> str:
        if len(v) != 6 or not v.isdigit():
            raise ValueError("OTP code must be exactly 6 digits")
        return v

    @field_validator("name")
    @classmethod
    def name_max_length(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 100:
            raise ValueError("Name must be at most 100 characters")
        return v

    @field_validator("password")
    @classmethod
    def password_max_length(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 128:
            raise ValueError("Password must be at most 128 characters")
        return v


class ForgotPasswordPayload(BaseModel):
    identifier: str  # phone or email

    @field_validator("identifier")
    @classmethod
    def identifier_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Phone or email is required")
        if len(v) > 200:
            raise ValueError("Identifier too long")
        return v


class ResetPasswordPayload(BaseModel):
    identifier: str
    code: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v) > 128:
            raise ValueError("Password must be at most 128 characters")
        return v


class EmailRegisterPayload(BaseModel):
    email: EmailStr
    name: str
    password: str
    is_dealer: bool = False
    dealership_name: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name is required")
        if len(v) > 100:
            raise ValueError("Name must be at most 100 characters")
        return v

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v) > 128:
            raise ValueError("Password must be at most 128 characters")
        return v


class EmailLoginPayload(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False


class LoginPayload(BaseModel):
    phone: str
    password: str  # no length validation — let bcrypt decide
    remember_me: bool = False

    @field_validator("phone")
    @classmethod
    def phone_valid(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith("+"):
            raise ValueError("Phone must start with '+'")
        if len(v) < 7 or len(v) > 20:
            raise ValueError("Phone length invalid")
        return v


class VerifyEmailOtpPayload(BaseModel):
    email: EmailStr
    code: str

    @field_validator("code")
    @classmethod
    def code_length(cls, v: str) -> str:
        if len(v) != 6 or not v.isdigit():
            raise ValueError("OTP code must be exactly 6 digits")
        return v


class ResendEmailOtpPayload(BaseModel):
    email: EmailStr


def _send_sms(phone: str, message: str) -> bool:
    """Send SMS via Unimtx (primary) → Twilio (fallback) → dev log."""
    # ── 1. Unimtx ────────────────────────────────────────────────────────────
    if settings.unimtx_api_key:
        try:
            import httpx as _httpx
            resp = _httpx.post(
                "https://api.unimtx.com/",
                json={
                    "accessKeyId": settings.unimtx_api_key,
                    "action": "uni.message.send",
                    "to": phone,
                    "signature": settings.unimtx_sender_id,
                    "content": message,
                },
                timeout=10.0,
            )
            body = resp.json()
            if body.get("code") == "0":
                return True
            logger.error("Unimtx error for %s: %s", phone, body)
            return False
        except Exception:
            logger.exception("Unimtx SMS failed to %s", phone)
            return False

    # ── 2. Twilio fallback ────────────────────────────────────────────────────
    if settings.twilio_account_sid and settings.twilio_auth_token and settings.twilio_from_number:
        try:
            from twilio.rest import Client
            client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
            client.messages.create(
                body=message,
                from_=settings.twilio_from_number,
                to=phone,
            )
            return True
        except Exception:
            logger.exception("Twilio SMS failed to %s", phone)
            return False

    # ── 3. Dev mode: log only ────────────────────────────────────────────────
    logger.warning("[DEV MODE] SMS OTP for %s — message: %s", phone, message)
    return True


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=ApiResponse[AuthResponse],
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("3/hour")
def register(request: Request, response: Response, payload: UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.phone == payload.phone, User.is_deleted == False).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this phone number already exists",
        )

    user = User(
        phone=payload.phone,
        name=payload.name,
        password_hash=hash_password(payload.password),
    )
    if payload.is_dealer:
        user.role = UserRole.dealer
    db.add(user)
    db.flush()  # get user.id before creating Dealer

    if payload.is_dealer:
        dealer = Dealer(
            user_id=user.id,
            business_name=(payload.dealership_name or payload.name or "").strip() or "My Dealership",
        )
        db.add(dealer)

    db.commit()
    db.refresh(user)

    from app.services.telegram_notifier import notify_admin_new_user
    background_tasks.add_task(notify_admin_new_user, user.name, user.phone, user.email, "phone")

    token = Token(access_token=create_access_token({"sub": str(user.id), "role": user.role.value}, token_version=user.token_version))
    _set_auth_cookie(response, token.access_token, remember_me=payload.remember_me)
    return ApiResponse(
        success=True,
        data=AuthResponse(token=token, user=UserResponse.model_validate(user)),
        message="Registration successful",
    )


@router.post(
    "/login",
    response_model=ApiResponse[AuthResponse],
)
@limiter.limit("5/15minutes")
def login(request: Request, response: Response, payload: LoginPayload, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone == payload.phone, User.is_deleted == False).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    if user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended",
        )

    _STAFF_ROLES_PHONE = {UserRole.admin, UserRole.moderator, UserRole.manager, UserRole.support, UserRole.dealer}
    if not user.phone_verified and user.role not in _STAFF_ROLES_PHONE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Phone not verified",
        )

    user.last_login_at = datetime.now(timezone.utc)
    log_audit(db, user.id, "login", "user", user.id, {"method": "phone", "ip": request.client.host if request.client else None})
    db.commit()
    token = Token(access_token=create_access_token({"sub": str(user.id), "role": user.role.value}, token_version=user.token_version))
    _set_auth_cookie(response, token.access_token, remember_me=payload.remember_me)
    return ApiResponse(
        success=True,
        data=AuthResponse(token=token, user=UserResponse.model_validate(user)),
        message="Login successful",
    )


@router.get(
    "/me",
    response_model=ApiResponse[AuthResponse],
)
def me(response: Response, current_user: User = Depends(get_current_user)):
    # Issue a fresh token so the frontend can restore the in-memory token on page refresh
    token = Token(
        access_token=create_access_token(
            {"sub": str(current_user.id), "role": current_user.role.value},
            token_version=current_user.token_version,
        )
    )
    _set_auth_cookie(response, token.access_token)
    return ApiResponse(
        success=True,
        data=AuthResponse(token=token, user=UserResponse.model_validate(current_user)),
        message="Current user fetched",
    )


@router.post("/logout", response_model=ApiResponse[None])
def logout(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Invalidate all existing tokens for this user by bumping token_version."""
    current_user.token_version = (current_user.token_version or 0) + 1
    db.commit()
    _clear_auth_cookie(response)
    return ApiResponse(success=True, data=None, message="Logged out")


@router.put("/profile", response_model=ApiResponse[UserResponse])
@limiter.limit("20/minute")
def update_profile(
    request: Request,
    payload: UpdateProfilePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.name is not None:
        current_user.name = payload.name
    if payload.email is not None and payload.email != current_user.email:
        existing = db.query(User).filter(User.email == payload.email, User.id != current_user.id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")
        current_user.email = payload.email
        # Verified status belongs to the old address — the new one must re-verify
        current_user.email_verified = False
    if payload.whatsapp_number is not None:
        current_user.whatsapp_number = payload.whatsapp_number
    db.commit()
    db.refresh(current_user)
    return ApiResponse(success=True, data=UserResponse.model_validate(current_user), message="Profile updated")


@router.put("/change-password", response_model=ApiResponse[None])
@limiter.limit("5/hour")
def change_password(
    request: Request,
    payload: ChangePasswordPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be at least 8 characters")
    current_user.password_hash = hash_password(payload.new_password)
    current_user.token_version = (current_user.token_version or 0) + 1
    db.commit()
    if current_user.email:
        background_tasks.add_task(send_password_changed, current_user.email)
    return ApiResponse(success=True, data=None, message="Password changed successfully")


@router.post("/send-otp", response_model=ApiResponse[dict])
@limiter.limit("10/minute")
def send_otp(request: Request, payload: SendOtpPayload, db: Session = Depends(get_db)):
    """Generate and send a 6-digit OTP to the given phone number.

    Rate-limited to 5 per hour per IP and 3 per 30 minutes per phone.
    In dev mode (no Twilio env vars), the code is returned in the response for testing.
    """
    # Per-phone rate limit: max 3 OTP requests per 30 minutes
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=30)
    recent_count = (
        db.query(OtpCode)
        .filter(
            OtpCode.phone == payload.phone,
            OtpCode.purpose == "phone_auth",
            OtpCode.created_at >= cutoff,
        )
        .count()
    )
    if recent_count >= 3:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Слишком много запросов. Попробуйте через 30 минут.",
        )

    # Invalidate any existing unused phone_auth OTPs for this phone before issuing a new one
    # (filter by purpose to avoid accidentally cancelling password_reset codes)
    db.query(OtpCode).filter(
        OtpCode.phone == payload.phone,
        OtpCode.purpose == "phone_auth",
        OtpCode.is_used == False,
    ).update({"is_used": True})

    code = str(secrets.randbelow(900000) + 100000)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    otp = OtpCode(phone=payload.phone, code=code, expires_at=expires_at)
    db.add(otp)
    db.commit()

    message = f"Ваш код подтверждения TajCar.tj: {code}. Действителен 10 минут."
    _send_sms(payload.phone, message)

    dev_code = None
    sms_configured = bool(settings.unimtx_api_key or settings.twilio_account_sid)
    if not sms_configured and settings.environment == "development":
        logger.debug("[DEV OTP] phone=%s code=%s", payload.phone, code)
        dev_code = code

    return ApiResponse(
        success=True,
        data={"dev_code": dev_code} if dev_code else {},
        message="OTP sent",
    )


@router.post("/verify-otp", response_model=ApiResponse[AuthResponse])
@limiter.limit("10/hour")
def verify_otp(request: Request, response: Response, payload: VerifyOtpPayload, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Verify OTP code.

    - If user exists with this phone: log them in.
    - If user does not exist: register them (name is used when provided).
    Returns a JWT token on success.
    """
    now = datetime.now(timezone.utc)

    # Find the most recent unused, non-expired phone_auth OTP for this phone
    otp = (
        db.query(OtpCode)
        .filter(
            OtpCode.phone == payload.phone,
            OtpCode.purpose == "phone_auth",
            OtpCode.is_used == False,
            OtpCode.expires_at > now,
        )
        .order_by(OtpCode.created_at.desc())
        .first()
    )

    if not otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP code",
        )

    # Per-phone brute-force protection: lock after 5 failed attempts
    if otp.attempts >= 5:
        otp.is_used = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many incorrect attempts. Request a new code.",
        )

    if otp.code != payload.code:
        otp.attempts += 1
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP code",
        )

    # Consume the OTP — commit immediately so it cannot be reused even if
    # a subsequent check (e.g. is_banned) raises an HTTPException.
    otp.is_used = True
    db.commit()

    # Include soft-deleted users so we don't hit a unique constraint on re-insert
    user = db.query(User).filter(User.phone == payload.phone).first()

    # Look up most recent used TelegramToken for this phone to get Telegram name/chat_id
    tg_token = (
        db.query(TelegramToken)
        .filter(TelegramToken.phone == payload.phone, TelegramToken.is_used == True)
        .order_by(TelegramToken.created_at.desc())
        .first()
    )
    tg_name = tg_token.telegram_name if tg_token else None
    tg_chat_id = tg_token.telegram_chat_id if tg_token else None

    # Enforce unique telegram_chat_id — reject if already owned by a different user
    if tg_chat_id:
        existing_tg_user = db.query(User).filter(User.telegram_chat_id == tg_chat_id).first()
        if existing_tg_user and (user is None or str(existing_tg_user.id) != str(user.id)):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This Telegram account is already linked to a different phone number. "
                       "Log in with that number or use a different verification method.",
            )

    if user:
        # Existing (or previously deleted) user — restore if deleted, then log in
        if user.is_deleted:
            user.is_deleted = False
            user.deleted_at = None
        if user.is_banned:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is suspended")
        # Save telegram_chat_id if we have it and user doesn't
        if tg_chat_id and not user.telegram_chat_id:
            user.telegram_chat_id = tg_chat_id
        db.commit()
        db.refresh(user)
    else:
        # New user — register; prefer payload name, fall back to Telegram name
        name = (payload.name or "").strip() or tg_name or None
        chosen_password = payload.password.strip() if payload.password else None
        if not chosen_password or len(chosen_password) < 8:
            chosen_password = secrets.token_hex(16)  # random if not provided
        user = User(
            phone=payload.phone,
            name=name,
            password_hash=hash_password(chosen_password),
            phone_verified=True,
            telegram_chat_id=tg_chat_id,
        )
        if payload.is_dealer:
            user.role = UserRole.dealer
        db.add(user)
        db.flush()

        if payload.is_dealer:
            dealer = Dealer(
                user_id=user.id,
                business_name=(payload.dealership_name or name or "").strip() or "My Dealership",
            )
            db.add(dealer)

        db.commit()
        db.refresh(user)

        from app.services.telegram_notifier import notify_admin_new_user
        method_str = "telegram" if tg_chat_id else "otp"
        background_tasks.add_task(notify_admin_new_user, user.name, user.phone, user.email, method_str)

    # Send welcome message to bot in the background (non-blocking)
    chat_id_for_bot = tg_chat_id or user.telegram_chat_id
    if chat_id_for_bot:
        from app.routers.telegram_webhook import send_welcome_message
        background_tasks.add_task(send_welcome_message, chat_id_for_bot, user.name)

    method = "telegram_otp" if tg_chat_id else "phone_otp"
    user.last_login_at = datetime.now(timezone.utc)
    log_audit(db, user.id, "login", "user", user.id, {"method": method, "ip": request.client.host if request.client else None})
    db.commit()
    token = Token(access_token=create_access_token({"sub": str(user.id), "role": user.role.value}, token_version=user.token_version))
    _set_auth_cookie(response, token.access_token)
    return ApiResponse(
        success=True,
        data=AuthResponse(token=token, user=UserResponse.model_validate(user)),
        message="Authentication successful",
    )


# ─── Email authentication ─────────────────────────────────────────────────────

def _generate_and_store_email_otp(email: str, db: Session) -> str:
    """Invalidate old email OTPs, create a new one, return the code."""
    db.query(OtpCode).filter(
        OtpCode.email == email,
        OtpCode.purpose == "email_verify",
        OtpCode.is_used == False,
    ).update({"is_used": True})

    code = str(secrets.randbelow(900000) + 100000)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    otp = OtpCode(email=email, purpose="email_verify", code=code, expires_at=expires_at)
    db.add(otp)
    db.commit()
    return code


@router.post("/register-email", response_model=ApiResponse[dict], status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")
def register_email(request: Request, payload: EmailRegisterPayload, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Register with email + password. Sends a 6-digit OTP to the email for verification."""
    existing = db.query(User).filter(User.email == payload.email, User.is_deleted == False).first()
    if existing:
        if existing.email_verified:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
        # Unverified account exists — resend OTP instead of blocking
        code = _generate_and_store_email_otp(payload.email, db)
        send_email_otp(payload.email, code, purpose="verify")
        dev_code = None
        if not settings.resend_api_key and settings.environment == "development":
            logger.debug("[DEV OTP] email=%s code=%s", payload.email, code)
            dev_code = code
        return ApiResponse(
            success=True,
            data={"dev_code": dev_code} if dev_code else {},
            message="Verification code resent to your email",
        )

    # Create user with email_verified=False; phone is null for email-only accounts
    user = User(
        phone=None,
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        email_verified=False,
    )
    if payload.is_dealer:
        user.role = UserRole.dealer
    db.add(user)
    db.flush()  # get the ID without committing

    if payload.is_dealer:
        dealer = Dealer(
            user_id=user.id,
            business_name=(payload.dealership_name or payload.name or "").strip() or "My Dealership",
        )
        db.add(dealer)

    code = _generate_and_store_email_otp(payload.email, db)
    db.commit()

    from app.services.telegram_notifier import notify_admin_new_user
    background_tasks.add_task(notify_admin_new_user, payload.name, None, payload.email, "email")

    send_success = send_email_otp(payload.email, code, purpose="verify")
    if not send_success and settings.environment == "production":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification email. Please try again later.",
        )

    dev_code = None
    if not settings.resend_api_key and settings.environment == "development":
        logger.debug("[DEV OTP] email=%s code=%s", payload.email, code)
        dev_code = code

    return ApiResponse(
        success=True,
        data={"dev_code": dev_code} if dev_code else {},
        message="Registration successful. Check your email for the verification code.",
    )


@router.post("/verify-email-otp", response_model=ApiResponse[AuthResponse])
@limiter.limit("10/hour")
def verify_email_otp(request: Request, response: Response, payload: VerifyEmailOtpPayload, db: Session = Depends(get_db)):
    """Verify the 6-digit OTP sent to the email. Returns a JWT on success."""
    now = datetime.now(timezone.utc)

    # Look up the most recent unused, unexpired OTP for this email (any code)
    # so we can track attempts even on wrong codes
    otp = (
        db.query(OtpCode)
        .filter(
            OtpCode.email == payload.email,
            OtpCode.purpose == "email_verify",
            OtpCode.is_used == False,
            OtpCode.expires_at > now,
        )
        .order_by(OtpCode.created_at.desc())
        .first()
    )

    if not otp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification code")

    # Brute-force protection: lock after 5 failed attempts
    if otp.attempts >= 5:
        otp.is_used = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many incorrect attempts. Request a new code.",
        )

    if otp.code != payload.code:
        otp.attempts += 1
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification code")

    # Consume the OTP immediately so it cannot be replayed even if a
    # subsequent check (e.g. is_banned, account not found) raises an exception.
    otp.is_used = True
    db.commit()

    user = db.query(User).filter(User.email == payload.email, User.is_deleted == False).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    if user.is_banned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is suspended")

    user.email_verified = True
    user.last_login_at = datetime.now(timezone.utc)
    log_audit(db, user.id, "login", "user", user.id, {"method": "email_otp", "ip": request.client.host if request.client else None})
    db.commit()

    # Send welcome email (fire-and-forget — don't block the response)
    try:
        send_welcome_email(user.email, user.name)
    except Exception:
        pass

    token = Token(access_token=create_access_token({"sub": str(user.id), "role": user.role.value}, token_version=user.token_version))
    _set_auth_cookie(response, token.access_token)
    return ApiResponse(
        success=True,
        data=AuthResponse(token=token, user=UserResponse.model_validate(user)),
        message="Email verified. Welcome to TajCar.tj!",
    )


@router.post("/login-email", response_model=ApiResponse[AuthResponse])
@limiter.limit("10/15minutes")
def login_email(request: Request, response: Response, payload: EmailLoginPayload, db: Session = Depends(get_db)):
    """Login with email + password."""
    user = db.query(User).filter(User.email == payload.email, User.is_deleted == False).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if user.is_banned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is suspended")

    _STAFF_ROLES = {UserRole.admin, UserRole.moderator, UserRole.manager, UserRole.support}
    if not user.email_verified and user.role not in _STAFF_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Please check your inbox for the verification code.",
        )

    user.last_login_at = datetime.now(timezone.utc)
    log_audit(db, user.id, "login", "user", user.id, {"method": "email_password", "ip": request.client.host if request.client else None})
    db.commit()
    token = Token(access_token=create_access_token({"sub": str(user.id), "role": user.role.value}, token_version=user.token_version))
    _set_auth_cookie(response, token.access_token, remember_me=payload.remember_me)
    return ApiResponse(
        success=True,
        data=AuthResponse(token=token, user=UserResponse.model_validate(user)),
        message="Login successful",
    )


@router.post("/resend-email-otp", response_model=ApiResponse[dict])
@limiter.limit("3/hour")
def resend_email_otp(request: Request, payload: ResendEmailOtpPayload, db: Session = Depends(get_db)):
    """Resend email verification OTP. Rate-limited to 3/hour."""
    user = db.query(User).filter(User.email == payload.email, User.is_deleted == False).first()
    if not user:
        return ApiResponse(success=True, data={}, message="If that email is registered, a code has been sent")
    if user.email_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already verified")

    code = _generate_and_store_email_otp(payload.email, db)
    send_success = send_email_otp(payload.email, code, purpose="verify")
    if not send_success and settings.environment == "production":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification email.",
        )

    dev_code = None
    if not settings.resend_api_key and settings.environment == "development":
        logger.debug("[DEV OTP] email=%s code=%s", payload.email, code)
        dev_code = code

    return ApiResponse(
        success=True,
        data={"dev_code": dev_code} if dev_code else {},
        message="Verification code sent",
    )


# ─── Forgot / Reset password ──────────────────────────────────────────────────

@router.post("/forgot-password", response_model=ApiResponse[dict])
@limiter.limit("3/hour")
def forgot_password(request: Request, payload: ForgotPasswordPayload, db: Session = Depends(get_db)):
    """Send a password-reset OTP to the user's phone or email."""
    identifier = payload.identifier.strip()
    is_email = "@" in identifier

    if is_email:
        user = db.query(User).filter(User.email == identifier, User.is_deleted == False).first()
        if not user:
            # Don't reveal existence
            return ApiResponse(success=True, data={}, message="If that account exists, a code has been sent")
        # Invalidate old reset OTPs for this email
        db.query(OtpCode).filter(
            OtpCode.email == identifier,
            OtpCode.purpose == "password_reset",
            OtpCode.is_used == False,
        ).update({"is_used": True})
        code = str(secrets.randbelow(900000) + 100000)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        db.add(OtpCode(email=identifier, purpose="password_reset", code=code, expires_at=expires_at))
        db.commit()
        send_email_otp(identifier, code, purpose="reset")
        dev_code = None
        if not settings.resend_api_key and settings.environment == "development":
            logger.debug("[DEV OTP] email=%s code=%s", identifier, code)
            dev_code = code
        return ApiResponse(success=True, data={"dev_code": dev_code} if dev_code else {}, message="Code sent to your email")
    else:
        user = db.query(User).filter(User.phone == identifier, User.is_deleted == False).first()
        if not user:
            return ApiResponse(success=True, data={}, message="If that account exists, a code has been sent")
        db.query(OtpCode).filter(
            OtpCode.phone == identifier,
            OtpCode.purpose == "password_reset",
            OtpCode.is_used == False,
        ).update({"is_used": True})
        code = str(secrets.randbelow(900000) + 100000)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        db.add(OtpCode(phone=identifier, purpose="password_reset", code=code, expires_at=expires_at))
        db.commit()
        message_text = f"Ваш код сброса пароля TajCar.tj: {code}. Действителен 10 минут."
        _send_sms(identifier, message_text)
        dev_code = None
        sms_configured = bool(settings.unimtx_api_key or settings.twilio_account_sid)
        if not sms_configured and settings.environment == "development":
            logger.debug("[DEV OTP] phone=%s code=%s", identifier, code)
            dev_code = code
        return ApiResponse(success=True, data={"dev_code": dev_code} if dev_code else {}, message="Code sent to your phone")


@router.post("/forgot-password-telegram", response_model=ApiResponse[dict])
@limiter.limit("3/hour")
def forgot_password_telegram(
    request: Request,
    payload: ForgotPasswordPayload,
    db: Session = Depends(get_db),
):
    """Send a password-reset OTP via Telegram if user has a linked Telegram account."""
    import httpx as _httpx

    identifier = payload.identifier.strip()
    is_email = "@" in identifier

    if is_email:
        user = db.query(User).filter(User.email == identifier, User.is_deleted == False).first()
    else:
        user = db.query(User).filter(User.phone == identifier, User.is_deleted == False).first()

    # Return available=False without revealing account existence to unauthenticated callers
    if not user or not user.telegram_chat_id:
        return ApiResponse(
            success=True,
            data={"available": False},
            message="No Telegram account linked to this identifier",
        )

    # Invalidate old reset OTPs for this identifier
    if is_email:
        db.query(OtpCode).filter(
            OtpCode.email == identifier,
            OtpCode.purpose == "password_reset",
            OtpCode.is_used == False,
        ).update({"is_used": True})
    else:
        db.query(OtpCode).filter(
            OtpCode.phone == identifier,
            OtpCode.purpose == "password_reset",
            OtpCode.is_used == False,
        ).update({"is_used": True})

    code = str(secrets.randbelow(900000) + 100000)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    if is_email:
        db.add(OtpCode(email=identifier, purpose="password_reset", code=code, expires_at=expires_at))
    else:
        db.add(OtpCode(phone=identifier, purpose="password_reset", code=code, expires_at=expires_at))

    # Send OTP via Telegram Bot API (sync httpx) — commit only after successful send
    bot_token = settings.telegram_bot_token
    if bot_token:
        tg_text = (
            f"Ваш код сброса пароля TajCar.tj: *{code}*\n\n"
            f"Действителен 10 минут.\nНикому не сообщайте этот код."
        )
        try:
            with _httpx.Client(timeout=10) as client:
                resp = client.post(
                    f"https://api.telegram.org/bot{bot_token}/sendMessage",
                    json={
                        "chat_id": user.telegram_chat_id,
                        "text": tg_text,
                        "parse_mode": "Markdown",
                    },
                )
                resp.raise_for_status()
        except Exception:
            logger.exception("Failed to send Telegram reset code to %s", user.telegram_chat_id)
            db.rollback()
            return ApiResponse(
                success=False,
                data={"available": False},
                message="Failed to deliver code via Telegram. Please try another method.",
            )
    else:
        # Dev mode: log the code so it is visible in server output
        if settings.environment == "development":
            logger.debug("[DEV OTP] telegram chat_id=%s code=%s", user.telegram_chat_id, code)

    db.commit()

    return ApiResponse(
        success=True,
        data={"available": True},
        message="Code sent to your Telegram",
    )


@router.post("/reset-password", response_model=ApiResponse[None])
@limiter.limit("5/hour")
def reset_password(request: Request, payload: ResetPasswordPayload, db: Session = Depends(get_db)):
    """Verify reset OTP and set a new password."""
    now = datetime.now(timezone.utc)
    identifier = payload.identifier.strip()
    is_email = "@" in identifier

    # Look up the most recent unused, unexpired OTP without the code filter first,
    # so we can enforce brute-force protection regardless of whether the code matches.
    if is_email:
        otp = (
            db.query(OtpCode)
            .filter(
                OtpCode.email == identifier,
                OtpCode.purpose == "password_reset",
                OtpCode.is_used == False,
                OtpCode.expires_at > now,
            )
            .order_by(OtpCode.created_at.desc())
            .first()
        )
        user = db.query(User).filter(User.email == identifier, User.is_deleted == False).first()
    else:
        otp = (
            db.query(OtpCode)
            .filter(
                OtpCode.phone == identifier,
                OtpCode.purpose == "password_reset",
                OtpCode.is_used == False,
                OtpCode.expires_at > now,
            )
            .order_by(OtpCode.created_at.desc())
            .first()
        )
        user = db.query(User).filter(User.phone == identifier, User.is_deleted == False).first()

    if not otp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code")

    # Validate user before consuming the OTP, so we never waste a reset code
    # on a non-existent or suspended account.
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    if user.is_banned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is suspended")

    # Per-identifier brute-force protection: lock after 5 failed attempts
    if otp.attempts >= 5:
        otp.is_used = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many incorrect attempts. Request a new code.",
        )

    if otp.code != payload.code:
        otp.attempts += 1
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code")

    otp.is_used = True
    user.password_hash = hash_password(payload.new_password)
    user.token_version = (user.token_version or 0) + 1
    db.commit()

    return ApiResponse(success=True, data=None, message="Password updated successfully")


# ─── Telegram OTP ─────────────────────────────────────────────────────────────

class SendOtpTelegramPayload(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def phone_valid(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith("+"):
            raise ValueError("Phone must start with '+'")
        if len(v) < 7 or len(v) > 20:
            raise ValueError("Phone length invalid")
        return v


@router.post("/send-otp-telegram", response_model=ApiResponse[dict])
@limiter.limit("5/hour")
def send_otp_telegram(
    request: Request,
    payload: SendOtpTelegramPayload,
    db: Session = Depends(get_db),
):
    """Generate a one-time deep link for Telegram OTP delivery.

    The Telegram bot (/start <token>) will generate and send the OTP.
    The user then verifies via the regular POST /auth/verify-otp endpoint.
    """

    bot_username = settings.telegram_bot_username or None
    if not bot_username:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Telegram bot is not configured",
        )

    # Invalidate any pending (unused, unexpired) tokens for this phone
    db.query(TelegramToken).filter(
        TelegramToken.phone == payload.phone,
        TelegramToken.is_used == False,
    ).update({"is_used": True})

    token_str = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    db.add(TelegramToken(token=token_str, phone=payload.phone, expires_at=expires_at))
    db.commit()

    deep_link = f"https://telegram.me/{bot_username}?start={token_str}"
    return ApiResponse(
        success=True,
        data={"deep_link": deep_link},
        message="Open the link in Telegram to receive your verification code",
    )


# ─── Google OAuth ─────────────────────────────────────────────────────────────

class GoogleAuthPayload(BaseModel):
    id_token: str


@router.post("/google", response_model=ApiResponse[AuthResponse])
@limiter.limit("10/hour")
def google_auth(
    request: Request,
    response: Response,
    payload: GoogleAuthPayload,
    db: Session = Depends(get_db),
):
    """Verify a Google id_token and return a JWT.

    Frontend sends the token from Google Identity Services.
    Backend verifies with google-auth and finds or creates the user.
    """

    client_id = settings.google_client_id or None
    if not client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured on this server",
        )

    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests

        id_info = google_id_token.verify_oauth2_token(
            payload.id_token,
            google_requests.Request(),
            client_id,
        )
    except Exception as exc:
        logger.error("Google token verification failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Google token",
        )

    google_sub: str = id_info["sub"]
    email: Optional[str] = id_info.get("email")
    name: Optional[str] = id_info.get("name")
    google_email_verified: bool = bool(id_info.get("email_verified", False))

    # 1. Look up by google_id
    user = db.query(User).filter(User.google_id == google_sub, User.is_deleted == False).first()

    # 2. Fall back to email match — only if Google confirmed the email is verified
    if not user and email and google_email_verified:
        user = db.query(User).filter(User.email == email, User.is_deleted == False).first()
        if user:
            user.google_id = google_sub

    # 3. Create new user
    if not user:
        user = User(
            phone=f"google_{secrets.token_hex(4)}",
            name=name,
            email=email,
            google_id=google_sub,
            password_hash=hash_password(secrets.token_hex(32)),
            email_verified=google_email_verified and bool(email),
        )
        db.add(user)

    if user.is_banned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is suspended")

    user.last_login_at = datetime.now(timezone.utc)
    log_audit(db, user.id, "login", "user", user.id, {"method": "google", "ip": request.client.host if request.client else None})
    db.commit()
    db.refresh(user)

    token = Token(access_token=create_access_token({"sub": str(user.id), "role": user.role.value}, token_version=user.token_version))
    _set_auth_cookie(response, token.access_token)
    return ApiResponse(
        success=True,
        data=AuthResponse(token=token, user=UserResponse.model_validate(user)),
        message="Google authentication successful",
    )


# ─── Apple Sign In ────────────────────────────────────────────────────────────

class AppleAuthPayload(BaseModel):
    identity_token: str
    name: Optional[str] = None  # Apple only sends name on the very first sign-in


@router.post("/apple", response_model=ApiResponse[AuthResponse])
@limiter.limit("10/hour")
def apple_auth(
    request: Request,
    response: Response,
    payload: AppleAuthPayload,
    db: Session = Depends(get_db),
):
    """Verify an Apple identity_token and return a JWT.

    Frontend sends the token from Apple Sign In JS.
    Backend fetches Apple's JWKS and verifies the JWT locally.
    """
    import httpx
    from jose import jwt as jose_jwt, JWTError

    client_id = settings.apple_client_id or None
    if not client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Apple Sign In is not configured on this server",
        )

    # Fetch Apple's public keys
    try:
        resp = httpx.get("https://appleid.apple.com/auth/keys", timeout=10)
        resp.raise_for_status()
        apple_keys = resp.json()["keys"]
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not fetch Apple public keys",
        )

    # Decode header to find the key id
    try:
        header = jose_jwt.get_unverified_header(payload.identity_token)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Apple token header")

    kid = header.get("kid")
    key_dict = next((k for k in apple_keys if k.get("kid") == kid), None)
    if not key_dict:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Apple public key not found")

    try:
        claims = jose_jwt.decode(
            payload.identity_token,
            key_dict,
            algorithms=["RS256"],
            audience=client_id,
            issuer="https://appleid.apple.com",
        )
    except JWTError as exc:
        logger.error("Apple token verification failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Apple identity token",
        )

    apple_sub: str = claims["sub"]
    email: Optional[str] = claims.get("email")

    # 1. Look up by apple_id
    user = db.query(User).filter(User.apple_id == apple_sub, User.is_deleted == False).first()

    # 2. Fall back to email match — only if Apple has verified the email
    if not user and email and claims.get("email_verified") in (True, "true"):
        user = db.query(User).filter(User.email == email, User.is_deleted == False).first()
        if user:
            user.apple_id = apple_sub

    # 3. Create new user
    if not user:
        user = User(
            phone=f"apple_{secrets.token_hex(4)}",
            name=payload.name,
            email=email,
            apple_id=apple_sub,
            password_hash=hash_password(secrets.token_hex(32)),
            email_verified=bool(email),
        )
        db.add(user)

    if user.is_banned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is suspended")

    user.last_login_at = datetime.now(timezone.utc)
    log_audit(db, user.id, "login", "user", user.id, {"method": "apple", "ip": request.client.host if request.client else None})
    db.commit()
    db.refresh(user)

    token = Token(access_token=create_access_token({"sub": str(user.id), "role": user.role.value}, token_version=user.token_version))
    _set_auth_cookie(response, token.access_token)
    return ApiResponse(
        success=True,
        data=AuthResponse(token=token, user=UserResponse.model_validate(user)),
        message="Apple authentication successful",
    )


# ─── Google OAuth redirect flow ───────────────────────────────────────────────
# State CSRF protection uses HMAC-signed tokens so no cookie is needed.
# This survives reverse-proxy setups that strip Set-Cookie from 3xx responses.

import hmac as _hmac
import hashlib as _hashlib


def _sign_oauth_state(raw: str) -> str:
    """Return 'raw.HMAC' signed with SECRET_KEY."""
    sig = _hmac.new(
        settings.secret_key.encode(),
        raw.encode(),
        _hashlib.sha256,
    ).hexdigest()
    return f"{raw}.{sig}"


def _verify_oauth_state(signed: str) -> bool:
    """Return True if the signed state token is valid and not tampered with."""
    parts = signed.split(".", 1)
    if len(parts) != 2:
        return False
    raw, sig = parts
    expected = _hmac.new(
        settings.secret_key.encode(),
        raw.encode(),
        _hashlib.sha256,
    ).hexdigest()
    return _hmac.compare_digest(sig, expected)


@router.get("/google/redirect")
def google_oauth_redirect() -> Any:
    """Redirect the user to Google's OAuth consent page."""
    import urllib.parse
    from fastapi.responses import RedirectResponse as _RedirectResponse

    client_id = settings.google_client_id or None
    client_secret = settings.google_client_secret or None
    if not client_id or not client_secret:
        msg = "Google OAuth is not configured on this server (missing Client ID or Secret in .env)"
        logger.error(msg)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=msg,
        )
    redirect_uri = settings.google_redirect_uri
    # Sign the random state with HMAC — no cookie needed, survives any proxy
    raw_state = secrets.token_urlsafe(32)
    signed_state = _sign_oauth_state(raw_state)
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
        "prompt": "select_account",
        "state": signed_state,
    }
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
    return _RedirectResponse(url)


@router.get("/google/callback")
async def google_oauth_callback(
    request: Request,
    code: str = "",
    error: str = "",
    state: str = "",
) -> Any:
    """Exchange the OAuth code for user info, find/create user, redirect to frontend.

    Uses SessionLocal() directly (same pattern as telegram_webhook) to avoid
    SQLAlchemy MissingGreenlet errors that occur with Depends(get_db) in
    async routes.
    """
    import httpx
    import urllib.parse as _up
    from fastapi.responses import RedirectResponse as _RedirectResponse
    from app.database import SessionLocal

    frontend_url = settings.frontend_url
    client_id = settings.google_client_id
    client_secret = settings.google_client_secret
    redirect_uri = settings.google_redirect_uri

    # Validate CSRF state via HMAC signature (no cookie dependency)
    if not state or not _verify_oauth_state(state):
        logger.warning("Google OAuth state validation failed — possible CSRF or tampering")
        return _RedirectResponse(f"{frontend_url}/auth/login?error=google_failed&detail=state_invalid")

    if error or not code:
        return _RedirectResponse(f"{frontend_url}/auth/login?error=google_cancelled")

    # Exchange authorization code for access token
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            token_resp = await http.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            token_data = token_resp.json()
    except Exception as exc:
        logger.exception("Google token exchange failed")
        return _RedirectResponse(f"{frontend_url}/auth/login?error=google_failed&detail={_up.quote(str(exc))}")

    access_token = token_data.get("access_token")
    if not access_token:
        error_detail = token_data.get("error_description") or token_data.get("error") or "no access token"
        logger.error("Google token exchange returned no access_token: %s", error_detail)
        return _RedirectResponse(f"{frontend_url}/auth/login?error=google_failed&detail={_up.quote(error_detail)}")

    # Fetch user info from Google
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            userinfo_resp = await http.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            userinfo = userinfo_resp.json()
    except Exception as exc:
        logger.exception("Google userinfo fetch failed")
        return _RedirectResponse(f"{frontend_url}/auth/login?error=google_failed&detail={_up.quote(str(exc))}")

    google_sub: str = userinfo.get("id", "")
    email: Optional[str] = userinfo.get("email")
    name: Optional[str] = userinfo.get("name")

    if not google_sub:
        return _RedirectResponse(f"{frontend_url}/auth/login?error=google_failed")

    # DB work in its own block — session created and closed here, never via Depends
    db = SessionLocal()
    try:
        is_new_user = False
        user = db.query(User).filter(User.google_id == google_sub, User.is_deleted == False).first()
        if not user and email:
            user = db.query(User).filter(User.email == email, User.is_deleted == False).first()
            if user:
                user.google_id = google_sub
        if not user:
            is_new_user = True
            user = User(
                phone=f"google_{secrets.token_hex(4)}",
                name=name,
                email=email,
                google_id=google_sub,
                password_hash=hash_password(secrets.token_hex(32)),
                email_verified=bool(email),
            )
            db.add(user)

        if user.is_banned:
            return _RedirectResponse(f"{frontend_url}/auth/login?error=banned")

        db.commit()

        # Read scalar values before session closes
        user_id = str(user.id)
        token_version = user.token_version
        user_name = user.name
        user_role = user.role.value
    except Exception:
        db.rollback()
        logger.exception("Google OAuth DB error")
        return _RedirectResponse(f"{frontend_url}/auth/login?error=google_failed")
    finally:
        db.close()

    jwt_token = create_access_token({"sub": user_id, "role": user_role}, token_version=token_version)
    is_prod = settings.environment == "production"

    def _oauth_redirect(url: str) -> _RedirectResponse:
        """Build a redirect that sets the JWT as an HttpOnly cookie only.

        The token is intentionally NOT appended to the URL — doing so would
        expose the JWT in server access logs, browser history, and the
        Referer header sent to third-party resources on the destination page.
        The frontend must rely on the HttpOnly cookie or call GET /auth/me
        to obtain a fresh token after the redirect lands.
        """
        resp = _RedirectResponse(url)
        _set_auth_cookie(resp, jwt_token)
        return resp

    # New users (or users with no name) → name setup page
    if is_new_user or not user_name:
        encoded_name = _up.quote(name or "", safe="")
        return _oauth_redirect(f"{frontend_url}/auth/google-setup?name={encoded_name}")

    # Existing users → straight to callback (auto-login)
    return _oauth_redirect(f"{frontend_url}/auth/callback")
