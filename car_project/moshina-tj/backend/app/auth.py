from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer, OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.database import get_db
from app.models import User

# ---------------------------------------------------------------------------
# Password hashing — using bcrypt directly (passlib abandoned, incompatible)
# ---------------------------------------------------------------------------


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=13)).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        # If hashed is string (from DB), encode to bytes
        hashed_bytes = hashed.encode() if isinstance(hashed, str) else hashed
        return bcrypt.checkpw(plain.encode(), hashed_bytes)
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Password verification error: {e}")
        return False


# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------

_bearer_scheme = HTTPBearer(auto_error=False)


def create_access_token(data: dict, token_version: int = 0) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload["exp"] = expire
    payload["ver"] = token_version
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------

def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    token: Optional[str] = None
    if credentials:
        token = credentials.credentials
    if not token:
        token = request.cookies.get("token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = _decode_token(token)
    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing subject",
        )

    user = (
        db.query(User)
        .options(joinedload(User.dealer_profile))
        .filter(User.id == user_id, User.is_deleted == False)
        .first()
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists",
        )
    if user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended",
        )
    # Reject tokens issued before the user's token_version was bumped
    if payload.get("ver", 0) != user.token_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


# ---------------------------------------------------------------------------
# Optional auth dependency — returns None when no token is provided
# ---------------------------------------------------------------------------

_oauth2_optional = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login",
    auto_error=False,
)


def get_current_user_optional(
    request: Request,
    token: Optional[str] = Depends(_oauth2_optional),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Returns the authenticated user or None if no valid token is present."""
    if not token:
        token = request.cookies.get("token")
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: Optional[str] = payload.get("sub")
        if not user_id:
            return None
        user = (
            db.query(User)
            .filter(User.id == user_id, User.is_deleted == False)
            .options(joinedload(User.dealer_profile))
            .first()
        )
        if user and user.is_banned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is suspended",
            )
        if user and payload.get("ver", 0) != user.token_version:
            return None
        return user
    except JWTError:
        return None
