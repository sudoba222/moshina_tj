from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, Generic, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models import Currency, FuelType, ListingStatus, ListingType, TransmissionType, UserRole

# ---------------------------------------------------------------------------
# Generic API wrapper
# ---------------------------------------------------------------------------

DataT = TypeVar("DataT")


class ApiResponse(BaseModel, Generic[DataT]):
    success: bool
    data: Optional[DataT] = None
    message: str


# ---------------------------------------------------------------------------
# Auth / User schemas
# ---------------------------------------------------------------------------

class UserCreate(BaseModel):
    phone: str
    name: Optional[str] = None
    password: str

    @field_validator("phone")
    @classmethod
    def phone_must_be_valid(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith("+"):
            raise ValueError("Phone number must start with '+'")
        if len(v) < 7 or len(v) > 20:
            raise ValueError("Phone number must be between 7 and 20 characters")
        return v

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    phone: str
    name: Optional[str] = None
    email: Optional[str] = None
    role: UserRole
    avatar_url: Optional[str] = None
    is_banned: bool = False
    ban_reason: Optional[str] = None
    created_at: datetime


class UserPublicResponse(BaseModel):
    """Public-facing user profile — no sensitive fields exposed."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: Optional[str] = None
    role: UserRole
    avatar_url: Optional[str] = None
    created_at: datetime
    # phone is conditionally included at the router level


class UserUpdateRole(BaseModel):
    role: UserRole


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AuthResponse(BaseModel):
    token: Token
    user: UserResponse


# ---------------------------------------------------------------------------
# Rental rules schema
# ---------------------------------------------------------------------------

class RentalRules(BaseModel):
    min_age: Optional[int] = None
    deposit: Optional[Decimal] = None
    deposit_currency: Optional[str] = "USD"
    fuel_policy: Optional[str] = None  # "full_to_full", "free_tank", "same_level"
    delivery_available: Optional[bool] = False
    delivery_price: Optional[Decimal] = None
    max_km_per_day: Optional[int] = None
    extra_km_price: Optional[Decimal] = None
    insurance_included: Optional[bool] = False
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Listing schemas
# ---------------------------------------------------------------------------

class ImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    url: str
    is_primary: bool
    order_index: int


class ListingCreate(BaseModel):
    type: ListingType
    brand: str = Field(..., max_length=100)
    model: str = Field(..., max_length=100)
    year: int
    price: Decimal
    currency: Currency = Currency.USD
    mileage: Optional[int] = Field(default=None, ge=0, le=9_999_999)
    fuel: Optional[FuelType] = None
    transmission: Optional[TransmissionType] = None
    color: Optional[str] = Field(default=None, max_length=50)
    city: str = Field(..., max_length=100)
    description: Optional[str] = Field(default=None, max_length=5000)
    installment_available: bool = False
    image_urls: list[str] = Field(default=[], max_length=20)
    rental_rules: Optional[RentalRules] = None

    @field_validator("year")
    @classmethod
    def year_range(cls, v: int) -> int:
        if v < 1900 or v > 2100:
            raise ValueError("Year must be between 1900 and 2100")
        return v

    @field_validator("price")
    @classmethod
    def price_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Price must be greater than zero")
        return v

    @field_validator("brand", "model", "city")
    @classmethod
    def strip_strings(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Field cannot be empty")
        return v


class ListingUpdate(BaseModel):
    """All fields optional — only provided fields will be updated."""
    type: Optional[ListingType] = None
    brand: Optional[str] = Field(default=None, max_length=100)
    model: Optional[str] = Field(default=None, max_length=100)
    year: Optional[int] = None
    price: Optional[Decimal] = None
    currency: Optional[Currency] = None
    mileage: Optional[int] = Field(default=None, ge=0, le=9_999_999)
    fuel: Optional[FuelType] = None
    transmission: Optional[TransmissionType] = None
    color: Optional[str] = Field(default=None, max_length=50)
    city: Optional[str] = Field(default=None, max_length=100)
    description: Optional[str] = Field(default=None, max_length=5000)
    installment_available: Optional[bool] = None
    rental_rules: Optional[RentalRules] = None


class ListingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    type: ListingType
    brand: str
    model: str
    year: int
    price: Decimal
    currency: Currency
    mileage: Optional[int] = None
    fuel: Optional[FuelType] = None
    transmission: Optional[TransmissionType] = None
    color: Optional[str] = None
    city: str
    description: Optional[str] = None
    installment_available: bool
    is_dealer_listing: bool
    is_active: bool
    status: ListingStatus
    rejection_reason: Optional[str] = None
    moderated_by: Optional[uuid.UUID] = None
    views: int
    created_at: datetime
    updated_at: datetime
    images: list[ImageResponse] = []
    rental_rules: Optional[Dict[str, Any]] = None


class ListingListResponse(BaseModel):
    items: list[ListingResponse]
    total: int
    page: int
    pages: int


# ---------------------------------------------------------------------------
# Admin schemas
# ---------------------------------------------------------------------------

class AdminStats(BaseModel):
    total_users: int
    total_listings: int
    active_listings: int
    total_dealers: int
    pending_listings: int


# ---------------------------------------------------------------------------
# Dealer schemas
# ---------------------------------------------------------------------------

class DealerCreate(BaseModel):
    business_name: str = Field(..., max_length=200)
    city: Optional[str] = Field(default=None, max_length=100)
    address: Optional[str] = Field(default=None, max_length=300)
    phone: Optional[str] = Field(default=None, max_length=20)
    description: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("business_name")
    @classmethod
    def business_name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Business name cannot be empty")
        return v


class DealerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    business_name: str
    city: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    logo_url: Optional[str] = None
    description: Optional[str] = None
    verified: bool
    created_at: datetime


class DealerDetailResponse(BaseModel):
    """Dealer profile together with their active listings."""
    dealer: DealerResponse
    listings: list[ListingResponse]
