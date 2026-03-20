"""
reset_seed.py — Wipe all data and seed fresh users.

Run from backend/ directory:
    python reset_seed.py

Creates:
  Admin   — +992004702525 / sudoba2534
  Moderator — +992918277695 / sudoba2534
+ a handful of approved sample listings so the site has content.
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import text
from app.auth import hash_password
from app.database import SessionLocal, engine
from app.models import (
    Base, Currency, FuelType, Listing, ListingImage,
    ListingStatus, ListingType, TransmissionType, User, UserRole,
)

# ── Sample photos ─────────────────────────────────────────────────────────────
PHOTOS = {
    "toyota": [
        "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=1280&q=80",
        "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=1280&q=80",
    ],
    "bmw": [
        "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1280&q=80",
        "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=1280&q=80",
    ],
    "mercedes": [
        "https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=1280&q=80",
        "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=1280&q=80",
    ],
    "hyundai": [
        "https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=1280&q=80",
        "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=1280&q=80",
    ],
    "kia": [
        "https://images.unsplash.com/photo-1616422285623-13ff0162193c?w=1280&q=80",
        "https://images.unsplash.com/photo-1617469767053-d3b523a0b982?w=1280&q=80",
    ],
    "chevrolet": [
        "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1280&q=80",
        "https://images.unsplash.com/photo-1580274455191-1c62238fa333?w=1280&q=80",
    ],
}

LISTINGS = [
    {"brand": "Toyota",        "model": "Camry",        "year": 2022, "price": 26000, "mileage": 28000, "fuel": FuelType.petrol,  "transmission": TransmissionType.automatic, "color": "Белый",       "city": "Душанбе",  "photos": "toyota",    "type": ListingType.sale},
    {"brand": "Toyota",        "model": "Land Cruiser", "year": 2020, "price": 65000, "mileage": 55000, "fuel": FuelType.diesel,  "transmission": TransmissionType.automatic, "color": "Чёрный",      "city": "Душанбе",  "photos": "toyota",    "type": ListingType.sale},
    {"brand": "BMW",           "model": "5 Series",     "year": 2021, "price": 44000, "mileage": 40000, "fuel": FuelType.petrol,  "transmission": TransmissionType.automatic, "color": "Синий",       "city": "Душанбе",  "photos": "bmw",       "type": ListingType.sale},
    {"brand": "BMW",           "model": "X5",           "year": 2019, "price": 52000, "mileage": 80000, "fuel": FuelType.diesel,  "transmission": TransmissionType.automatic, "color": "Чёрный",      "city": "Хуҷанд",   "photos": "bmw",       "type": ListingType.sale},
    {"brand": "Mercedes-Benz", "model": "E-Class",      "year": 2022, "price": 58000, "mileage": 18000, "fuel": FuelType.petrol,  "transmission": TransmissionType.automatic, "color": "Серебристый", "city": "Душанбе",  "photos": "mercedes",  "type": ListingType.sale},
    {"brand": "Mercedes-Benz", "model": "GLE 350",      "year": 2021, "price": 72000, "mileage": 40000, "fuel": FuelType.petrol,  "transmission": TransmissionType.automatic, "color": "Чёрный",      "city": "Кӯлоб",    "photos": "mercedes",  "type": ListingType.sale},
    {"brand": "Hyundai",       "model": "Tucson",       "year": 2022, "price": 29000, "mileage": 32000, "fuel": FuelType.petrol,  "transmission": TransmissionType.automatic, "color": "Красный",     "city": "Хуҷанд",   "photos": "hyundai",   "type": ListingType.sale},
    {"brand": "Hyundai",       "model": "Elantra",      "year": 2023, "price": 20000, "mileage": 12000, "fuel": FuelType.petrol,  "transmission": TransmissionType.automatic, "color": "Синий",       "city": "Душанбе",  "photos": "hyundai",   "type": ListingType.sale},
    {"brand": "Kia",           "model": "Sportage",     "year": 2023, "price": 31000, "mileage": 8000,  "fuel": FuelType.petrol,  "transmission": TransmissionType.automatic, "color": "Белый",       "city": "Душанбе",  "photos": "kia",       "type": ListingType.sale},
    {"brand": "Chevrolet",     "model": "Malibu",       "year": 2021, "price": 16000, "mileage": 52000, "fuel": FuelType.petrol,  "transmission": TransmissionType.automatic, "color": "Серебристый", "city": "Душанбе",  "photos": "chevrolet", "type": ListingType.sale},
    {"brand": "Chevrolet",     "model": "Tahoe",        "year": 2022, "price": 82000, "mileage": 14000, "fuel": FuelType.petrol,  "transmission": TransmissionType.automatic, "color": "Чёрный",      "city": "Душанбе",  "photos": "chevrolet", "type": ListingType.sale},
    {"brand": "Toyota",        "model": "Corolla",      "year": 2022, "price": 50,    "mileage": 18000, "fuel": FuelType.petrol,  "transmission": TransmissionType.automatic, "color": "Серый",       "city": "Хуҷанд",   "photos": "toyota",    "type": ListingType.rent},
    {"brand": "BMW",           "model": "3 Series",     "year": 2021, "price": 80,    "mileage": 22000, "fuel": FuelType.petrol,  "transmission": TransmissionType.automatic, "color": "Белый",       "city": "Душанбе",  "photos": "bmw",       "type": ListingType.rent},
]


def reset_and_seed():
    db = SessionLocal()
    try:
        print("Wiping all data...")
        # TRUNCATE CASCADE handles FK ordering automatically
        tables = "listing_images, listings, dealers, otp_codes, telegram_tokens, search_logs, audit_logs, users"
        db.execute(text(f"TRUNCATE TABLE {tables} CASCADE"))
        db.commit()
        print("  All tables cleared.")

        print("\nCreating users...")
        admin = User(
            phone="+992004702525",
            name="Admin Sudoba",
            password_hash=hash_password("sudoba2534"),
            role=UserRole.admin,
        )
        moderator = User(
            phone="+992918277695",
            name="Moderator",
            password_hash=hash_password("sudoba2534"),
            role=UserRole.moderator,
        )
        db.add(admin)
        db.add(moderator)
        db.flush()
        print(f"  Admin:     {admin.phone}")
        print(f"  Moderator: {moderator.phone}")

        print("\nCreating sample listings (approved)...")
        for idx, ld in enumerate(LISTINGS):
            listing = Listing(
                user_id=admin.id,
                type=ld["type"],
                brand=ld["brand"],
                model=ld["model"],
                year=ld["year"],
                price=ld["price"],
                currency=Currency.USD,
                mileage=ld.get("mileage"),
                fuel=ld.get("fuel"),
                transmission=ld.get("transmission"),
                color=ld.get("color"),
                city=ld["city"],
                description=f"{ld['brand']} {ld['model']} {ld['year']} — отличное состояние, один хозяин.",
                installment_available=(ld["price"] > 10000 and ld["type"] == ListingType.sale),
                status=ListingStatus.active,
                is_active=True,
                moderated_by=admin.id,
                views=idx * 11,
            )
            db.add(listing)
            db.flush()

            for i, url in enumerate(PHOTOS.get(ld["photos"], [])):
                db.add(ListingImage(
                    listing_id=listing.id,
                    url=url,
                    is_primary=(i == 0),
                    order_index=i,
                ))

        db.commit()
        print(f"\nDone. Created 2 users and {len(LISTINGS)} listings.")
        print("\nCredentials:")
        print("  Admin     +992004702525 / sudoba2534")
        print("  Moderator +992918277695 / sudoba2534")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    reset_and_seed()
