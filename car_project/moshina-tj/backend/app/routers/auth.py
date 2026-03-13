from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.database import get_db
from app.models import User
from app.schemas import ApiResponse, AuthResponse, Token, UserCreate, UserResponse


class ChangePasswordPayload(BaseModel):
    current_password: str
    new_password: str


class UpdateProfilePayload(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)


@router.post(
    "/register",
    response_model=ApiResponse[AuthResponse],
    status_code=status.HTTP_201_CREATED,
)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.phone == payload.phone).first()
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
    db.add(user)
    db.commit()
    db.refresh(user)

    token = Token(access_token=create_access_token({"sub": str(user.id)}))
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
def login(request: Request, payload: UserCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone == payload.phone).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid phone number or password",
        )

    token = Token(access_token=create_access_token({"sub": str(user.id)}))
    return ApiResponse(
        success=True,
        data=AuthResponse(token=token, user=UserResponse.model_validate(user)),
        message="Login successful",
    )


@router.get(
    "/me",
    response_model=ApiResponse[UserResponse],
)
def me(current_user: User = Depends(get_current_user)):
    return ApiResponse(
        success=True,
        data=UserResponse.model_validate(current_user),
        message="Current user fetched",
    )


@router.put("/profile", response_model=ApiResponse[UserResponse])
def update_profile(
    payload: UpdateProfilePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.name is not None:
        current_user.name = payload.name
    if payload.email is not None:
        existing = db.query(User).filter(User.email == payload.email, User.id != current_user.id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")
        current_user.email = payload.email
    db.commit()
    db.refresh(current_user)
    return ApiResponse(success=True, data=UserResponse.model_validate(current_user), message="Profile updated")


@router.put("/change-password", response_model=ApiResponse[None])
def change_password(
    payload: ChangePasswordPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be at least 6 characters")
    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    return ApiResponse(success=True, data=None, message="Password changed successfully")
