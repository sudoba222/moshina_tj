import enum
import uuid as _uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    BigInteger,
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


class BodyType(str, enum.Enum):
    sedan = "sedan"
    suv = "suv"
    hatchback = "hatchback"
    minivan = "minivan"
    pickup = "pickup"
    coupe = "coupe"
    wagon = "wagon"
    crossover = "crossover"
    convertible = "convertible"
    van = "van"
    bus = "bus"
    other = "other"


class ListingStatus(str, enum.Enum):
    pending = "pending"      # Awaiting moderator review
    active = "active"        # Approved and visible to public
    rejected = "rejected"    # Rejected by moderator
    draft = "draft"          # Saved but not yet submitted


class AvailabilityStatus(str, enum.Enum):
    in_stock = "in_stock"   # Car is physically in Tajikistan
    on_order = "on_order"   # Car will be ordered/imported
    abroad = "abroad"       # Car is currently in another country


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
    user_number = Column(
        BigInteger,
        nullable=True,
        unique=True,
        index=True,
    )
    phone = Column(String(50), unique=True, nullable=False, index=True)
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
    whatsapp_number = Column(String(50), nullable=True)
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
    notifications = relationship(
        "Notification",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="Notification.created_at.desc()",
    )


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
    category_id = Column(
        UUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
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
    is_negotiable = Column(Boolean, nullable=False, default=False, server_default="false")
    prepayment_amount = Column(Numeric(12, 2), nullable=True)
    mileage = Column(Integer, nullable=True)
    fuel = Column(Enum(FuelType, name="fueltype"), nullable=True)
    transmission = Column(Enum(TransmissionType, name="transmissiontype"), nullable=True)
    body_type = Column(Enum(BodyType, name="bodytype"), nullable=True, index=True)
    drive_type = Column(String(50), nullable=True)
    engine_volume = Column(String(50), nullable=True)
    has_turbine = Column(Boolean, nullable=True)
    condition = Column(String(50), nullable=True)  # New, Used
    is_customs_cleared = Column(Boolean, nullable=False, default=True, server_default="true")
    taxi_license = Column(Boolean, nullable=False, default=False, server_default="false")
    color = Column(String(50), nullable=True)
    city = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # Social & Video
    youtube_link = Column(String(500), nullable=True)
    tiktok_link = Column(String(500), nullable=True)
    video_url = Column(String(500), nullable=True)

    # Contact Info (Overrides user defaults if provided)
    contact_name = Column(String(100), nullable=True)
    contact_email = Column(String(200), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    contact_method = Column(String(50), nullable=True)  # "phone_and_chat", "phone_only"
    whatsapp_number = Column(String(50), nullable=True)

    availability = Column(
        Enum(AvailabilityStatus, name="availabilitystatus"),
        nullable=False,
        default=AvailabilityStatus.in_stock,
        server_default="in_stock",
    )
    installment_available = Column(Boolean, nullable=False, default=False, server_default="false")
    is_dealer_listing = Column(Boolean, nullable=False, default=False, server_default="false")
    is_deleted = Column(Boolean, nullable=False, default=False, server_default="false")
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
    category = relationship("Category", foreign_keys=[category_id])
    images = relationship(
        "ListingImage",
        back_populates="listing",
        cascade="all, delete-orphan",
        order_by="ListingImage.order_index",
    )
    logs = relationship(
        "ListingLog",
        foreign_keys="ListingLog.listing_id",
        order_by="ListingLog.created_at.asc()",
        lazy="select",
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


class ListingLog(Base):
    """Immutable audit trail for every status change or action on a listing."""
    __tablename__ = "listing_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    listing_id = Column(
        UUID(as_uuid=True),
        ForeignKey("listings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    actor_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    # action values: "created", "approved", "rejected", "deactivated", "reactivated", "edited"
    action = Column(String(50), nullable=False)
    from_status = Column(String(50), nullable=True)
    to_status = Column(String(50), nullable=True)
    reason = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    listing = relationship("Listing", foreign_keys=[listing_id], overlaps="logs")
    actor = relationship("User", foreign_keys=[actor_id])


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
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

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
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())


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
    parent_id = Column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="CASCADE"), nullable=True, index=True)
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

    # Relationships
    parent = relationship("Category", remote_side=[id], backref="subcategories")


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


# ---------------------------------------------------------------------------
# Communication & Engagement enums
# ---------------------------------------------------------------------------

class ConversationType(str, enum.Enum):
    direct = "direct"
    support = "support"


class NotificationType(str, enum.Enum):
    message = "message"
    price_drop = "price_drop"
    dealer_post = "dealer_post"
    system = "system"


# ---------------------------------------------------------------------------
# Communication & Engagement models
# ---------------------------------------------------------------------------

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    type = Column(Enum(ConversationType, name="conversationtype"), nullable=False)
    participant1_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    participant2_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    listing_id = Column(
        UUID(as_uuid=True),
        ForeignKey("listings.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        UniqueConstraint(
            "participant1_id", "participant2_id", "listing_id",
            name="uq_conversation",
        ),
    )

    # Relationships
    participant1 = relationship("User", foreign_keys=[participant1_id])
    participant2 = relationship("User", foreign_keys=[participant2_id])
    listing = relationship("Listing", foreign_keys=[listing_id])
    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, nullable=False, default=False, server_default="false")
    created_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])


class DealerSubscription(Base):
    __tablename__ = "dealer_subscriptions"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    dealer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("dealers.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        UniqueConstraint("user_id", "dealer_id", name="uq_dealer_subscription"),
    )

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    dealer = relationship("Dealer", foreign_keys=[dealer_id])


class Notification(Base):
    __tablename__ = "notifications"

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
    type = Column(Enum(NotificationType, name="notificationtype"), nullable=False)
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    link = Column(String(500), nullable=True)
    is_read = Column(Boolean, nullable=False, default=False, server_default="false")
    created_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Relationships
    user = relationship("User", back_populates="notifications", foreign_keys=[user_id])
