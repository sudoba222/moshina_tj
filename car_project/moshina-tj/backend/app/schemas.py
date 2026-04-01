from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, Generic, Literal, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models import AvailabilityStatus, BodyType, Currency, FuelType, ListingStatus, ListingType, TransmissionType, UserRole

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
    remember_me: bool = False

    @field_validator("phone")
    @classmethod
    def phone_must_be_valid(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith("+"):
            raise ValueError("Phone number must start with '+'")
        if len(v) < 7 or len(v) > 20:
            raise ValueError("Phone number must be between 7 and 20 characters")
        return v

    @field_validator("name")
    @classmethod
    def name_max_length(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v.strip()) > 100:
            raise ValueError("Name must be at most 100 characters")
        return v

    @field_validator("password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v) > 128:
            raise ValueError("Password must be at most 128 characters")
        return v


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_number: Optional[int] = None
    phone: str
    name: Optional[str] = None
    email: Optional[str] = None
    role: UserRole
    avatar_url: Optional[str] = None
    whatsapp_number: Optional[str] = None
    email_verified: bool = False
    phone_verified: bool = False
    is_banned: bool = False
    ban_reason: Optional[str] = None
    created_at: datetime


class UserResponseAdmin(UserResponse):
    """Admin-only user response — exposes all sensitive fields (phone, email, ban info).
    Only returned to admin role users; moderators and managers receive UserPublicResponse."""
    pass


class UserUpdate(BaseModel):
    """Schema for partial profile updates — all fields optional."""
    name: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    whatsapp_number: Optional[str] = None


class UserPublicResponse(BaseModel):
    """Public-facing user profile — no sensitive fields exposed."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_number: Optional[int] = None
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
    category_id: Optional[uuid.UUID] = None
    type: ListingType
    brand: str
    model: str
    year: int
    price: Decimal
    currency: Currency = Currency.USD
    is_negotiable: bool = False
    prepayment_amount: Optional[Decimal] = None
    mileage: Optional[int] = None
    fuel: Optional[FuelType] = None
    transmission: Optional[TransmissionType] = None
    body_type: Optional[BodyType] = None
    drive_type: Optional[str] = None
    engine_volume: Optional[str] = None
    has_turbine: Optional[bool] = None
    condition: Optional[str] = None
    is_customs_cleared: bool = True
    taxi_license: bool = False
    color: Optional[str] = None
    city: str
    description: Optional[str] = None
    
    # Social & Video
    youtube_link: Optional[str] = None
    tiktok_link: Optional[str] = None
    video_url: Optional[str] = None

    # Contact Info
    contact_name: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = Field(default=None, max_length=50)
    contact_method: Literal["phone_and_chat", "phone_only", "chat_only"] = "phone_and_chat"
    whatsapp_number: Optional[str] = Field(default=None, max_length=50)

    availability: AvailabilityStatus = AvailabilityStatus.in_stock
    installment_available: bool = False
    image_urls: list[str] = []
    rental_rules: Optional[RentalRules] = None

    @field_validator("contact_phone", mode="before")
    @classmethod
    def strip_contact_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
        return v or None

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

    @field_validator("mileage")
    @classmethod
    def mileage_non_negative(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("Mileage cannot be negative")
        return v

    @field_validator("brand", "model", "city")
    @classmethod
    def strip_strings(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Field cannot be empty")
        if len(v) > 100:
            raise ValueError("Field cannot exceed 100 characters")
        return v

    @field_validator("color")
    @classmethod
    def color_max_length(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 50:
            raise ValueError("Color cannot exceed 50 characters")
        return v

    @field_validator("description")
    @classmethod
    def description_max_length(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 5000:
            raise ValueError("Description cannot exceed 5000 characters")
        return v

    @field_validator("image_urls")
    @classmethod
    def image_urls_max_count(cls, v: list[str]) -> list[str]:
        if len(v) > 20:
            raise ValueError("Cannot upload more than 20 images per listing")
        return v

    @field_validator("image_urls")
    @classmethod
    def image_urls_allowed_domains(cls, v: list[str]) -> list[str]:
        from app.config import settings as _settings
        for url in v:
            if not (
                url.startswith("https://res.cloudinary.com/")
                or url.startswith("/uploads/")
                or (_settings.environment != "production" and url.startswith("http://localhost"))
            ):
                raise ValueError(
                    "Invalid image URL: only Cloudinary and local upload URLs are accepted"
                )
        return v

    @field_validator("youtube_link")
    @classmethod
    def validate_youtube_link(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        _YOUTUBE_DOMAINS = ("youtube.com/", "youtu.be/", "www.youtube.com/")
        if not v.startswith("https://") or not any(d in v for d in _YOUTUBE_DOMAINS):
            raise ValueError("youtube_link must be a valid https://youtube.com or https://youtu.be URL")
        return v

    @field_validator("tiktok_link")
    @classmethod
    def validate_tiktok_link(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        _TIKTOK_DOMAINS = ("tiktok.com/", "vm.tiktok.com/")
        if not v.startswith("https://") or not any(d in v for d in _TIKTOK_DOMAINS):
            raise ValueError("tiktok_link must be a valid https://tiktok.com URL")
        return v

    @field_validator("video_url")
    @classmethod
    def validate_video_url(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        _VIDEO_DOMAINS = ("youtube.com/", "youtu.be/", "www.youtube.com/", "tiktok.com/", "vm.tiktok.com/")
        if not v.startswith("https://") or not any(d in v for d in _VIDEO_DOMAINS):
            raise ValueError("video_url must be a valid https:// YouTube or TikTok URL")
        return v


class ListingUpdate(BaseModel):
    """All fields optional — only provided fields will be updated."""
    category_id: Optional[uuid.UUID] = None
    type: Optional[ListingType] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    price: Optional[Decimal] = None
    currency: Optional[Currency] = None
    is_negotiable: Optional[bool] = None
    prepayment_amount: Optional[Decimal] = None
    mileage: Optional[int] = None
    fuel: Optional[FuelType] = None
    transmission: Optional[TransmissionType] = None
    body_type: Optional[BodyType] = None
    drive_type: Optional[str] = None
    engine_volume: Optional[str] = None
    has_turbine: Optional[bool] = None
    condition: Optional[str] = None
    is_customs_cleared: Optional[bool] = None
    taxi_license: Optional[bool] = None
    color: Optional[str] = None
    city: Optional[str] = None
    description: Optional[str] = None
    
    youtube_link: Optional[str] = None
    tiktok_link: Optional[str] = None
    video_url: Optional[str] = None

    contact_name: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = Field(default=None, max_length=50)
    contact_method: Optional[Literal["phone_and_chat", "phone_only", "chat_only"]] = None
    whatsapp_number: Optional[str] = Field(default=None, max_length=50)

    availability: Optional[AvailabilityStatus] = None
    installment_available: Optional[bool] = None
    rental_rules: Optional[RentalRules] = None
    image_urls: Optional[list[str]] = None

    @field_validator("contact_phone", mode="before")
    @classmethod
    def strip_contact_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
        return v or None

    @field_validator("image_urls")
    @classmethod
    def image_urls_max_count(cls, v: Optional[list[str]]) -> Optional[list[str]]:
        if v is not None and len(v) > 20:
            raise ValueError("Cannot upload more than 20 images per listing")
        return v

    @field_validator("image_urls")
    @classmethod
    def image_urls_allowed_domains(cls, v: Optional[list[str]]) -> Optional[list[str]]:
        if v is None:
            return v
        from app.config import settings as _settings
        for url in v:
            if not (
                url.startswith("https://res.cloudinary.com/")
                or url.startswith("/uploads/")
                or (_settings.environment != "production" and url.startswith("http://localhost"))
            ):
                raise ValueError(
                    "Invalid image URL: only Cloudinary and local upload URLs are accepted"
                )
        return v

    @field_validator("youtube_link")
    @classmethod
    def validate_youtube_link(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        _YOUTUBE_DOMAINS = ("youtube.com/", "youtu.be/", "www.youtube.com/")
        if not v.startswith("https://") or not any(d in v for d in _YOUTUBE_DOMAINS):
            raise ValueError("youtube_link must be a valid https://youtube.com or https://youtu.be URL")
        return v

    @field_validator("tiktok_link")
    @classmethod
    def validate_tiktok_link(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        _TIKTOK_DOMAINS = ("tiktok.com/", "vm.tiktok.com/")
        if not v.startswith("https://") or not any(d in v for d in _TIKTOK_DOMAINS):
            raise ValueError("tiktok_link must be a valid https://tiktok.com URL")
        return v

    @field_validator("video_url")
    @classmethod
    def validate_video_url(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        _VIDEO_DOMAINS = ("youtube.com/", "youtu.be/", "www.youtube.com/", "tiktok.com/", "vm.tiktok.com/")
        if not v.startswith("https://") or not any(d in v for d in _VIDEO_DOMAINS):
            raise ValueError("video_url must be a valid https:// YouTube or TikTok URL")
        return v


class ListingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    category_id: Optional[uuid.UUID] = None
    type: ListingType
    brand: str
    model: str
    year: int
    price: Decimal
    currency: Currency
    is_negotiable: bool
    prepayment_amount: Optional[Decimal] = None
    mileage: Optional[int] = None
    fuel: Optional[FuelType] = None
    transmission: Optional[TransmissionType] = None
    body_type: Optional[BodyType] = None
    drive_type: Optional[str] = None
    engine_volume: Optional[str] = None
    has_turbine: Optional[bool] = None
    condition: Optional[str] = None
    is_customs_cleared: bool
    taxi_license: bool
    color: Optional[str] = None
    city: str
    description: Optional[str] = None
    
    youtube_link: Optional[str] = None
    tiktok_link: Optional[str] = None
    video_url: Optional[str] = None

    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_method: Optional[str] = None
    whatsapp_number: Optional[str] = None

    availability: AvailabilityStatus = AvailabilityStatus.in_stock
    installment_available: bool
    is_dealer_listing: bool
    is_active: bool
    status: ListingStatus
    rejection_reason: Optional[str] = None
    moderator_note: Optional[str] = None
    moderated_by: Optional[uuid.UUID] = None
    views: int
    created_at: datetime
    updated_at: datetime
    images: list[ImageResponse] = []
    rental_rules: Optional[Dict[str, Any]] = None
    user_name: Optional[str] = None


class ListingListResponse(BaseModel):
    items: list[ListingResponse]
    total: int
    page: int
    pages: int


# ---------------------------------------------------------------------------
# Admin schemas
# ---------------------------------------------------------------------------

class GrowthPoint(BaseModel):
    date: str
    count: int


class AdminStats(BaseModel):
    total_users: int
    new_users_today: int
    total_listings: int
    active_listings: int
    pending_listings: int
    rejected_listings: int
    total_dealers: int
    verified_dealers: int
    user_growth: list[GrowthPoint]
    listing_growth: list[GrowthPoint]


# ---------------------------------------------------------------------------
# Dealer schemas
# ---------------------------------------------------------------------------

class DealerCreate(BaseModel):
    business_name: str
    city: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    description: Optional[str] = None

    @field_validator("business_name")
    @classmethod
    def business_name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Business name cannot be empty")
        if len(v) > 200:
            raise ValueError("Business name must be at most 200 characters")
        return v

    @field_validator("phone")
    @classmethod
    def phone_max_length(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if len(v) > 20:
                raise ValueError("Phone must be at most 20 characters")
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


# ---------------------------------------------------------------------------
# Search schemas
# ---------------------------------------------------------------------------

class SuggestionItem(BaseModel):
    term: str
    type: str   # "brand", "model", "city"
    count: int
