import enum
import uuid as _uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    TIMESTAMP,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func, text

from app.database import Base


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class UserRole(str, enum.Enum):
    user = "user"
    dealer = "dealer"
    admin = "admin"
    moderator = "moderator"
    manager = "manager"
    support = "support"


class ListingType(str, enum.Enum):
    sale = "sale"
    rent = "rent"


class Currency(str, enum.Enum):
    USD = "USD"
    TJS = "TJS"


class FuelType(str, enum.Enum):
    petrol = "Бензин"
    diesel = "Дизель"
    gas = "Газ"
    electric = "Электро"
    hybrid = "Гибрид"


class TransmissionType(str, enum.Enum):
    automatic = "Автомат"
    manual = "Механика"
    cvt = "Вариатор"


class ListingStatus(str, enum.Enum):
    pending = "pending"      # Awaiting moderator review
    active = "active"        # Approved and visible to public
    rejected = "rejected"    # Rejected by moderator
    draft = "draft"          # Saved but not yet submitted


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    phone = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=True)
    email = Column(String(200), unique=True, nullable=True, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(
        Enum(UserRole, name="userrole"),
        nullable=False,
        default=UserRole.user,
        server_default="user",
    )
    avatar_url = Column(Text, nullable=True)
    email_verified = Column(Boolean, nullable=False, default=False, server_default="false")
    phone_verified = Column(Boolean, nullable=False, default=False, server_default="false")
    google_id = Column(String(200), unique=True, nullable=True, index=True)
    apple_id = Column(String(200), unique=True, nullable=True, index=True)
    telegram_chat_id = Column(String(50), unique=True, nullable=True, index=True)
    is_banned = Column(Boolean, nullable=False, default=False, server_default="false")
    ban_reason = Column(Text, nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False, server_default="false")
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    token_version = Column(Integer, nullable=False, default=0, server_default="0")
    created_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Relationships
    listings = relationship("Listing", back_populates="user", cascade="all, delete-orphan", foreign_keys="Listing.user_id")
    dealer_profile = relationship("Dealer", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Listing(Base):
    __tablename__ = "listings"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type = Column(Enum(ListingType, name="listingtype"), nullable=False)
    brand = Column(String(100), nullable=False, index=True)
    model = Column(String(100), nullable=False, index=True)
    year = Column(Integer, nullable=False)
    price = Column(Numeric(12, 2), nullable=False)
    currency = Column(
        Enum(Currency, name="currency"),
        nullable=False,
        default=Currency.USD,
        server_default="USD",
    )
    mileage = Column(Integer, nullable=True)
    fuel = Column(Enum(FuelType, name="fueltype"), nullable=True)
    transmission = Column(Enum(TransmissionType, name="transmissiontype"), nullable=True)
    color = Column(String(50), nullable=True)
    city = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    installment_available = Column(Boolean, nullable=False, default=False, server_default="false")
    is_dealer_listing = Column(Boolean, nullable=False, default=False, server_default="false")
    is_active = Column(Boolean, nullable=False, default=True, server_default="true", index=True)
    status = Column(
        Enum(ListingStatus, name="listingstatus"),
        nullable=False,
        default=ListingStatus.pending,
        server_default="pending",
        index=True,
    )
    rejection_reason = Column(Text, nullable=True)
    moderator_note = Column(Text, nullable=True)
    moderated_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    views = Column(Integer, nullable=False, default=0, server_default="0")
    created_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    rental_rules = Column(JSON, nullable=True)
    locked_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    locked_at = Column(TIMESTAMP(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="listings", foreign_keys=[user_id])
    images = relationship(
        "ListingImage",
        back_populates="listing",
        cascade="all, delete-orphan",
        order_by="ListingImage.order_index",
    )

    @property
    def user_name(self) -> Optional[str]:
        try:
            return self.user.name if self.user else None
        except Exception:
            return None


class ListingImage(Base):
    __tablename__ = "listing_images"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    listing_id = Column(
        UUID(as_uuid=True),
        ForeignKey("listings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    url = Column(Text, nullable=False)
    cloudinary_id = Column(Text, nullable=True)
    is_primary = Column(Boolean, nullable=False, default=False, server_default="false")
    order_index = Column(Integer, nullable=False, default=0, server_default="0")

    # Relationships
    listing = relationship("Listing", back_populates="images")


class ModerationSession(Base):
    __tablename__ = "moderation_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    moderator_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    started_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    ended_at = Column(TIMESTAMP(timezone=True), nullable=True)
    posts_approved = Column(Integer, nullable=False, default=0, server_default="0")
    posts_rejected = Column(Integer, nullable=False, default=0, server_default="0")
    posts_skipped = Column(Integer, nullable=False, default=0, server_default="0")
    is_active = Column(Boolean, nullable=False, default=True, server_default="true")
    timer_minutes = Column(Integer, nullable=True)
    filter_date_from = Column(TIMESTAMP(timezone=True), nullable=True)
    filter_date_to = Column(TIMESTAMP(timezone=True), nullable=True)
    filter_type = Column(String(20), nullable=True)
    filter_city = Column(String(100), nullable=True)
    filter_brand = Column(String(100), nullable=True)
    auto_ended = Column(Boolean, nullable=False, default=False, server_default='false')
    last_skip_reason = Column(Text, nullable=True)

    moderator = relationship("User", foreign_keys=[moderator_id])


class Dealer(Base):
    __tablename__ = "dealers"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    business_name = Column(String(200), nullable=False)
    city = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    phone = Column(String(20), nullable=True)
    logo_url = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    verified = Column(Boolean, nullable=False, default=False, server_default="false")
    created_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Relationships
    user = relationship("User", back_populates="dealer_profile")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid.uuid4)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False, index=True)
    target_type = Column(String(50), nullable=True)   # "user", "listing", "dealer"
    target_id = Column(UUID(as_uuid=True), nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    actor = relationship("User", foreign_keys=[actor_id])


class SearchLog(Base):
    __tablename__ = "search_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=_uuid.uuid4)
    query = Column(String(500), nullable=False, index=True)
    results_count = Column(Integer, nullable=False, default=0)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class OtpCode(Base):
    __tablename__ = "otp_codes"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    # phone OTP: phone is set, email is null
    # email OTP: email is set, phone is null
    phone = Column(String(20), nullable=True, index=True)
    email = Column(String(200), nullable=True, index=True)
    purpose = Column(String(20), nullable=False, default="phone_auth", server_default="phone_auth")
    code = Column(String(6), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, nullable=False, default=False, server_default="false")
    attempts = Column(Integer, nullable=False, default=0, server_default="0")
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())


class TelegramToken(Base):
    """One-time token used to link a Telegram deep link to a phone number.

    Flow:
    1. POST /auth/send-otp-telegram  → creates this record, returns deep link
    2. Bot /start <token>            → looks up token, generates OTP in otp_codes, marks used
    3. POST /auth/verify-otp         → existing endpoint verifies the OTP as usual
    """
    __tablename__ = "telegram_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    token = Column(String(64), unique=True, nullable=False, index=True)
    phone = Column(String(20), nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, nullable=False, default=False, server_default="false")
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    telegram_name = Column(String(200), nullable=True)     # first_name from Telegram
    telegram_chat_id = Column(String(32), nullable=True)   # chat_id from Telegram


class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    listing_id = Column(UUID(as_uuid=True), ForeignKey("listings.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (UniqueConstraint("user_id", "listing_id", name="uq_favorite_user_listing"),)

    user = relationship("User", foreign_keys=[user_id])
    listing = relationship("Listing", foreign_keys=[listing_id])


class Brand(Base):
    __tablename__ = "brands"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    name = Column(String(100), nullable=False, unique=True)
    slug = Column(String(100), nullable=False, unique=True)
    logo_url = Column(String(500), nullable=True)
    country = Column(String(100), nullable=True)
    is_popular = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    models = relationship("CarModel", back_populates="brand", lazy="select")


class CarModel(Base):
    __tablename__ = "car_models"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    brand_id = Column(UUID(as_uuid=True), ForeignKey("brands.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    brand = relationship("Brand", back_populates="models")
    __table_args__ = (UniqueConstraint("brand_id", "name", name="uq_brand_model"),)


class Category(Base):
    __tablename__ = "categories"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    name_ru = Column(String(100), nullable=False)
    name_tj = Column(String(100), nullable=False)
    slug = Column(String(100), nullable=False, unique=True)
    icon_url = Column(String(500), nullable=True)
    description_ru = Column(Text, nullable=True)
    description_tj = Column(Text, nullable=True)
    filter_config = Column(JSON, nullable=True)
    display_order = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)


class Banner(Base):
    __tablename__ = "banners"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    title_ru = Column(String(200), nullable=False)
    title_tj = Column(String(200), nullable=False)
    subtitle_ru = Column(String(300), nullable=True)
    subtitle_tj = Column(String(300), nullable=True)
    image_url = Column(String(500), nullable=False)
    link_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    display_order = Column(Integer, default=0, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)


def log_audit(db, actor_id, action: str, target_type: str = None, target_id=None, details: dict = None):
    """Helper to record an admin/moderator action in the audit log."""
    entry = AuditLog(
        actor_id=actor_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details,
    )
    db.add(entry)
    # Don't commit here — caller commits with their main transaction
