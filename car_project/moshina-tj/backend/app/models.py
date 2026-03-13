import enum

from sqlalchemy import (
    Boolean,
    Column,
    Enum,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    TIMESTAMP,
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
    is_banned = Column(Boolean, nullable=False, default=False, server_default="false")
    ban_reason = Column(Text, nullable=True)
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
