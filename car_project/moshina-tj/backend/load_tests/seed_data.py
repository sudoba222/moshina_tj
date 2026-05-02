"""
TAJCAR.TJ Load Test Seed Script
================================
Creates 50 test users and 10,000 listings in the database so the load test
runs against realistic data volumes.

Usage:
    python seed_data.py              # seed (idempotent — skips existing)
    python seed_data.py --cleanup    # delete everything this script created

The script reads DATABASE_URL from the environment (or a .env file in the
backend root).  It does NOT import the FastAPI app — it talks to SQLAlchemy
directly using the same models the app uses, so schema drift is impossible.

Requirements: the app's venv must be active (all app dependencies present).
"""

from __future__ import annotations

import argparse
import os
import random
import sys
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Bootstrap: make sure the backend package is on sys.path regardless of where
# this script is called from.
# ---------------------------------------------------------------------------
_BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_BACKEND_ROOT))

# Load .env before importing anything that reads settings
try:
    from dotenv import load_dotenv
    load_dotenv(_BACKEND_ROOT / ".env")
except ImportError:
    pass  # python-dotenv is optional; env vars may already be set

# ---------------------------------------------------------------------------
# Imports — after sys.path is patched
# ---------------------------------------------------------------------------
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.auth import hash_password
from app.models import (
    AvailabilityStatus,
    Base,
    BodyType,
    Currency,
    FuelType,
    Listing,
    ListingImage,
    ListingStatus,
    ListingType,
    TransmissionType,
    User,
    UserRole,
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
SEED_TAG = "loadtest_seed_v1"          # stored in listing description to identify seeded rows
USER_COUNT = 50
TOTAL_LISTINGS = 10_000
ACTIVE_FRACTION = 0.20                 # 20% of listings are active/visible
PASSWORD = "loadtest123"
PHONE_PREFIX = "+9920000000"           # results in +992000000000 … +992000000049

CITIES = [
    "Dushanbe", "Khujand", "Kulob", "Qurghonteppa", "Istaravshan",
    "Tursunzoda", "Vahdat", "Konibodom", "Panjakent", "Norak",
]

# Realistic Tajikistan car market data
CAR_DATA: list[tuple[str, list[str]]] = [
    ("Daewoo",    ["Nexia", "Matiz", "Cobalt", "Lacetti", "Gentra", "Damas"]),
    ("Toyota",    ["Camry", "Corolla", "Land Cruiser", "Prius", "RAV4", "Hilux"]),
    ("Chevrolet", ["Cobalt", "Captiva", "Cruze", "Spark", "Malibu", "Tahoe"]),
    ("Hyundai",   ["Accent", "Elantra", "Tucson", "Santa Fe", "Sonata", "Creta"]),
    ("Kia",       ["Rio", "Sportage", "Sorento", "Cerato", "K5", "Picanto"]),
    ("Honda",     ["Civic", "Accord", "CR-V", "Fit", "HR-V", "City"]),
    ("Lada",      ["Priora", "Granta", "Vesta", "Kalina", "Largus", "Niva"]),
    ("BMW",       ["3 Series", "5 Series", "X5", "X3", "7 Series", "X6"]),
    ("Mercedes",  ["C-Class", "E-Class", "S-Class", "GLC", "GLE", "A-Class"]),
    ("Volkswagen",["Polo", "Passat", "Golf", "Tiguan", "Touareg", "Jetta"]),
    ("Nissan",    ["Sentra", "Qashqai", "X-Trail", "Juke", "Note", "Murano"]),
    ("Mazda",     ["Mazda 3", "Mazda 6", "CX-5", "CX-7", "Mazda 2"]),
    ("Mitsubishi",["Lancer", "Outlander", "Pajero", "Eclipse Cross"]),
    ("Subaru",    ["Outback", "Forester", "Impreza", "Legacy", "XV"]),
    ("Lexus",     ["RX 300", "RX 350", "ES 300", "LX 570", "IS 250"]),
    ("Audi",      ["A4", "A6", "Q5", "Q7", "A3", "A8"]),
    ("Ford",      ["Focus", "Mondeo", "Kuga", "Explorer", "F-150"]),
    ("Opel",      ["Astra", "Vectra", "Insignia", "Zafira", "Mokka"]),
    ("Renault",   ["Duster", "Logan", "Sandero", "Koleos", "Megane"]),
    ("Peugeot",   ["207", "301", "2008", "3008", "5008"]),
]

COLORS = [
    "Белый", "Черный", "Серый", "Серебристый", "Синий",
    "Красный", "Бежевый", "Зеленый", "Коричневый", "Золотой",
]

FUEL_TYPES = [
    FuelType.petrol, FuelType.petrol, FuelType.petrol,  # weighted: 60% petrol
    FuelType.diesel, FuelType.diesel,                    # 20% diesel
    FuelType.gas,                                        # 10% gas
    FuelType.hybrid,                                     # 6% hybrid
    FuelType.electric,                                   # 4% electric
]

TRANSMISSION_TYPES = [
    TransmissionType.automatic, TransmissionType.automatic,  # 50% auto
    TransmissionType.manual, TransmissionType.manual,        # 40% manual
    TransmissionType.cvt,                                    # 10% cvt
]

BODY_TYPES = [
    BodyType.sedan, BodyType.sedan, BodyType.sedan,   # 30% sedan
    BodyType.suv, BodyType.suv,                       # 20% suv
    BodyType.hatchback, BodyType.hatchback,           # 20% hatchback
    BodyType.crossover,                               # 10% crossover
    BodyType.wagon,                                   # 7% wagon
    BodyType.minivan,                                 # 5% minivan
    BodyType.pickup,                                  # 4% pickup
    BodyType.coupe,                                   # 4% coupe
]

DESCRIPTIONS = [
    "Автомобиль в отличном состоянии, ухоженный, без ДТП.",
    "Продаю в связи с отъездом. Возможен торг.",
    "Один хозяин, полная история обслуживания.",
    "Свежий таможенный, только что пригнан из России.",
    "Семейный автомобиль, просторный салон, хорошее состояние.",
    "Срочная продажа! Цена ниже рынка.",
    "Автомобиль на ходу, всё работает. Торг уместен.",
    "Хороший вариант для города, экономичный двигатель.",
    "Чистый кузов, без ржавчины. Зимняя резина в подарок.",
    "Отличный вариант для ежедневных поездок.",
]


# ---------------------------------------------------------------------------
# Database setup
# ---------------------------------------------------------------------------

def _get_engine():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL is not set.")
        print("       Set it in backend/.env or export it as an environment variable.")
        sys.exit(1)
    return create_engine(
        db_url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
    )


# ---------------------------------------------------------------------------
# Seed helpers
# ---------------------------------------------------------------------------

def _get_or_create_users(session) -> list[User]:
    """Return the list of seed users, creating any that don't yet exist."""
    users = []
    hashed = hash_password(PASSWORD)

    for i in range(USER_COUNT):
        phone = f"{PHONE_PREFIX}{i:02d}"
        user = session.query(User).filter(User.phone == phone).first()
        if not user:
            user = User(
                phone=phone,
                name=f"Load Test User {i:02d}",
                password_hash=hashed,
                role=UserRole.user,
                phone_verified=True,
                email_verified=True,
            )
            session.add(user)

        users.append(user)

    session.flush()   # assign IDs before returning
    return users


def _make_listing(user: User, active: bool, index: int) -> Listing:
    """Build one Listing ORM object with realistic Tajikistan car data."""
    brand, models = random.choice(CAR_DATA)
    model = random.choice(models)
    year = random.randint(2000, 2024)
    city = random.choice(CITIES)
    price = random.randint(1500, 80000)
    color = random.choice(COLORS)
    mileage = random.randint(5000, 350000)
    fuel = random.choice(FUEL_TYPES)
    transmission = random.choice(TRANSMISSION_TYPES)
    body_type = random.choice(BODY_TYPES)
    description = f"{random.choice(DESCRIPTIONS)} [{SEED_TAG}]"
    currency = random.choice([Currency.USD, Currency.USD, Currency.USD, Currency.TJS])

    status = ListingStatus.active if active else ListingStatus.pending
    return Listing(
        user_id=user.id,
        type=ListingType.sale,
        brand=brand,
        model=model,
        year=year,
        price=price,
        currency=currency,
        mileage=mileage,
        fuel=fuel,
        transmission=transmission,
        body_type=body_type,
        color=color,
        city=city,
        description=description,
        status=status,
        is_active=active,
        is_deleted=False,
        is_customs_cleared=True,
        availability=AvailabilityStatus.in_stock,
        contact_method="phone_and_chat",
        contact_phone=user.phone,
    )


def _make_image(listing_id, index: int) -> ListingImage:
    """Attach a placeholder image so joinedload queries have data to return."""
    return ListingImage(
        listing_id=listing_id,
        url="https://res.cloudinary.com/demo/image/upload/sample.jpg",
        cloudinary_id=None,
        is_primary=True,
        order_index=0,
    )


# ---------------------------------------------------------------------------
# Main: seed
# ---------------------------------------------------------------------------

def seed(engine) -> None:
    Session = sessionmaker(bind=engine)
    session = Session()
    print(f"[seed] Connected to database.")

    try:
        # ------ Users -------------------------------------------------------
        print(f"[seed] Creating {USER_COUNT} load-test users...")
        users = _get_or_create_users(session)
        session.commit()
        print(f"[seed] {len(users)} users ready (phone: {PHONE_PREFIX}00 … {PHONE_PREFIX}{USER_COUNT-1:02d})")

        # Count existing seeded listings
        existing_count = (
            session.query(Listing)
            .filter(Listing.description.ilike(f"%{SEED_TAG}%"))
            .count()
        )
        remaining = TOTAL_LISTINGS - existing_count
        if remaining <= 0:
            print(f"[seed] {existing_count} listings already seeded. Nothing to do.")
            print("[seed] Run with --cleanup first if you want to reseed.")
            return

        print(f"[seed] {existing_count} seeded listings already exist. Creating {remaining} more...")

        # ------ Listings ----------------------------------------------------
        active_target = int(TOTAL_LISTINGS * ACTIVE_FRACTION)
        active_created = (
            session.query(Listing)
            .filter(
                Listing.description.ilike(f"%{SEED_TAG}%"),
                Listing.status == ListingStatus.active,
            )
            .count()
        )

        batch: list[Listing] = []
        batch_size = 500
        created = 0

        for i in range(remaining):
            global_index = existing_count + i
            active = (active_created + sum(1 for l in batch if l.status == ListingStatus.active)) < active_target
            user = users[global_index % len(users)]
            listing = _make_listing(user, active=active, index=global_index)
            batch.append(listing)

            if len(batch) >= batch_size:
                session.bulk_save_objects(batch)
                session.flush()

                # Attach one image per listing
                images = [_make_image(l.id, i) for i, l in enumerate(batch)]
                session.bulk_save_objects(images)
                session.commit()

                created += len(batch)
                batch.clear()

                if created % 1000 == 0 or created == remaining:
                    print(f"[seed]   {created}/{remaining} listings created...")

        # Flush remaining batch
        if batch:
            session.bulk_save_objects(batch)
            session.flush()
            images = [_make_image(l.id, i) for i, l in enumerate(batch)]
            session.bulk_save_objects(images)
            session.commit()
            created += len(batch)

        print(f"[seed] Done. {created} listings created.")

        # Summary
        total_active = (
            session.query(Listing)
            .filter(
                Listing.description.ilike(f"%{SEED_TAG}%"),
                Listing.status == ListingStatus.active,
            )
            .count()
        )
        total_all = (
            session.query(Listing)
            .filter(Listing.description.ilike(f"%{SEED_TAG}%"))
            .count()
        )
        print(f"[seed] Summary:")
        print(f"[seed]   Total seeded listings : {total_all:,}")
        print(f"[seed]   Active (visible)       : {total_active:,} ({100*total_active//max(total_all,1)}%)")
        print(f"[seed]   Pending (queue)        : {total_all - total_active:,}")

    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


# ---------------------------------------------------------------------------
# Main: cleanup
# ---------------------------------------------------------------------------

def cleanup(engine) -> None:
    Session = sessionmaker(bind=engine)
    session = Session()
    print("[cleanup] Starting...")

    try:
        # Delete seeded listings (cascades to ListingImage via FK or we do it manually)
        seeded_ids = [
            row.id
            for row in session.query(Listing.id)
            .filter(Listing.description.ilike(f"%{SEED_TAG}%"))
            .all()
        ]

        if not seeded_ids:
            print("[cleanup] No seeded listings found.")
        else:
            print(f"[cleanup] Deleting {len(seeded_ids):,} seeded listings and their images...")
            batch_size = 500
            for start in range(0, len(seeded_ids), batch_size):
                chunk = seeded_ids[start : start + batch_size]
                session.query(ListingImage).filter(ListingImage.listing_id.in_(chunk)).delete(
                    synchronize_session=False
                )
                session.query(Listing).filter(Listing.id.in_(chunk)).delete(
                    synchronize_session=False
                )
                session.commit()
                print(f"[cleanup]   Deleted batch {start//batch_size + 1}...")

            print(f"[cleanup] Listings deleted.")

        # Delete seeded users
        seeded_phones = [f"{PHONE_PREFIX}{i:02d}" for i in range(USER_COUNT)]
        deleted_users = (
            session.query(User)
            .filter(User.phone.in_(seeded_phones))
            .delete(synchronize_session=False)
        )
        session.commit()
        print(f"[cleanup] Deleted {deleted_users} seeded users.")
        print("[cleanup] Done.")

    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed or clean up load test data for TAJCAR.TJ."
    )
    parser.add_argument(
        "--cleanup",
        action="store_true",
        help="Delete all data created by this script instead of seeding.",
    )
    args = parser.parse_args()

    engine = _get_engine()

    if args.cleanup:
        cleanup(engine)
    else:
        seed(engine)

    engine.dispose()


if __name__ == "__main__":
    main()
