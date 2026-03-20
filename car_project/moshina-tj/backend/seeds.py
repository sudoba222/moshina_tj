"""
seeds.py — Populate the database with development data.

Run from backend/ directory:
    python seeds.py

Requires DATABASE_URL to be set in .env or environment.
"""

import os
import sys

# Make app importable when running this script directly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from app.auth import hash_password
from app.database import SessionLocal, engine
from app.models import (
    Base,
    Currency,
    Dealer,
    FuelType,
    Listing,
    ListingImage,
    ListingType,
    TransmissionType,
    User,
    UserRole,
)

# ---------------------------------------------------------------------------
# Seed data
# ---------------------------------------------------------------------------

USERS = [
    {
        "phone": "+992900000001",
        "name": "Алишер Рахимов",
        "password": "tajcar123",
        "role": UserRole.user,
    },
    {
        "phone": "+992900000002",
        "name": "Баходур Салимов",
        "password": "tajcar123",
        "role": UserRole.dealer,
    },
    {
        "phone": "+992900000003",
        "name": "Admin Moshina",
        "password": "tajcar123",
        "role": UserRole.admin,
    },
    {
        "phone": "+992900000004",
        "name": "Moderator Moshina",
        "password": "tajcar123",
        "role": UserRole.moderator,
    },
    {
        "phone": "+992900000005",
        "name": "Manager Moshina",
        "password": "tajcar123",
        "role": UserRole.manager,
    },
    {
        "phone": "+992900000006",
        "name": "Support Moshina",
        "password": "tajcar123",
        "role": UserRole.support,
    },
]

DEALERS = [
    {
        "user_phone": "+992900000002",
        "business_name": "АвтоТаджик Душанбе",
        "city": "Душанбе",
        "address": "ул. Айни 45, Душанбе",
        "phone": "+992372240001",
        "description": "Официальный дилер Toyota и Hyundai в Душанбе. Работаем с 2010 года.",
        "verified": True,
    },
    {
        "user_phone": "+992900000001",
        "business_name": "СугдАвто Хуҷанд",
        "city": "Хуҷанд",
        "address": "пр. Ленина 12, Хуҷанд",
        "phone": "+992342220010",
        "description": "Крупнейший автосалон севера Таджикистана. BMW, Mercedes, Kia.",
        "verified": True,
    },
]

# Real Unsplash car photo URLs (stable links)
_PHOTOS = {
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

LISTINGS_DATA = [
    # --- Toyota ---
    {
        "type": ListingType.sale, "brand": "Toyota", "model": "Camry", "year": 2021,
        "price": 25000, "currency": Currency.USD, "mileage": 35000,
        "fuel": FuelType.petrol, "transmission": TransmissionType.automatic,
        "color": "Белый", "city": "Душанбе",
        "description": "Toyota Camry в отличном состоянии. Один хозяин, полный сервис у дилера.",
        "installment_available": True, "user_phone": "+992900000002",
        "photos": "toyota",
    },
    {
        "type": ListingType.sale, "brand": "Toyota", "model": "Land Cruiser 200", "year": 2019,
        "price": 68000, "currency": Currency.USD, "mileage": 75000,
        "fuel": FuelType.diesel, "transmission": TransmissionType.automatic,
        "color": "Чёрный", "city": "Душанбе",
        "description": "Флагманский внедорожник Toyota. Полный привод, кожаный салон.",
        "installment_available": False, "user_phone": "+992900000002",
        "photos": "toyota",
    },
    {
        "type": ListingType.rent, "brand": "Toyota", "model": "Corolla", "year": 2022,
        "price": 50, "currency": Currency.USD, "mileage": 15000,
        "fuel": FuelType.petrol, "transmission": TransmissionType.automatic,
        "color": "Серый", "city": "Хуҷанд",
        "description": "Аренда Toyota Corolla от 50 USD/день. Страховка включена.",
        "installment_available": False, "user_phone": "+992900000001",
        "photos": "toyota",
    },
    # --- BMW ---
    {
        "type": ListingType.sale, "brand": "BMW", "model": "5 Series", "year": 2020,
        "price": 42000, "currency": Currency.USD, "mileage": 48000,
        "fuel": FuelType.petrol, "transmission": TransmissionType.automatic,
        "color": "Синий", "city": "Душанбе",
        "description": "BMW 520d xDrive, полный привод. Пакет M Sport. Все ТО у официального дилера.",
        "installment_available": True, "user_phone": "+992900000002",
        "photos": "bmw",
    },
    {
        "type": ListingType.sale, "brand": "BMW", "model": "X5", "year": 2018,
        "price": 55000, "currency": Currency.USD, "mileage": 90000,
        "fuel": FuelType.diesel, "transmission": TransmissionType.automatic,
        "color": "Чёрный", "city": "Бохтар",
        "description": "BMW X5 40d, дизель. Панорамная крыша, вентиляция сидений.",
        "installment_available": False, "user_phone": "+992900000001",
        "photos": "bmw",
    },
    {
        "type": ListingType.rent, "brand": "BMW", "model": "3 Series", "year": 2021,
        "price": 80, "currency": Currency.USD, "mileage": 22000,
        "fuel": FuelType.petrol, "transmission": TransmissionType.automatic,
        "color": "Белый", "city": "Душанбе",
        "description": "BMW 330i в аренду. Подходит для деловых поездок и аэропорта.",
        "installment_available": False, "user_phone": "+992900000002",
        "photos": "bmw",
    },
    # --- Mercedes ---
    {
        "type": ListingType.sale, "brand": "Mercedes-Benz", "model": "E-Class", "year": 2022,
        "price": 58000, "currency": Currency.USD, "mileage": 18000,
        "fuel": FuelType.petrol, "transmission": TransmissionType.automatic,
        "color": "Серебристый", "city": "Душанбе",
        "description": "Mercedes E200 AMG Line. Почти новый, на гарантии.",
        "installment_available": True, "user_phone": "+992900000002",
        "photos": "mercedes",
    },
    {
        "type": ListingType.sale, "brand": "Mercedes-Benz", "model": "GLE 350", "year": 2020,
        "price": 74000, "currency": Currency.USD, "mileage": 55000,
        "fuel": FuelType.petrol, "transmission": TransmissionType.automatic,
        "color": "Чёрный", "city": "Кӯлоб",
        "description": "Mercedes GLE 350 4MATIC. Все опции, буксировочный крюк.",
        "installment_available": False, "user_phone": "+992900000001",
        "photos": "mercedes",
    },
    {
        "type": ListingType.rent, "brand": "Mercedes-Benz", "model": "C-Class", "year": 2023,
        "price": 100, "currency": Currency.USD, "mileage": 5000,
        "fuel": FuelType.petrol, "transmission": TransmissionType.automatic,
        "color": "Белый", "city": "Душанбе",
        "description": "Представительская аренда Mercedes C300. Водитель предоставляется по запросу.",
        "installment_available": False, "user_phone": "+992900000002",
        "photos": "mercedes",
    },
    # --- Hyundai ---
    {
        "type": ListingType.sale, "brand": "Hyundai", "model": "Tucson", "year": 2021,
        "price": 28000, "currency": Currency.USD, "mileage": 42000,
        "fuel": FuelType.petrol, "transmission": TransmissionType.automatic,
        "color": "Красный", "city": "Хуҷанд",
        "description": "Hyundai Tucson Smart Plus. Климат-контроль, задняя камера, круиз.",
        "installment_available": True, "user_phone": "+992900000001",
        "photos": "hyundai",
    },
    {
        "type": ListingType.sale, "brand": "Hyundai", "model": "Elantra", "year": 2022,
        "price": 18500, "currency": Currency.USD, "mileage": 25000,
        "fuel": FuelType.petrol, "transmission": TransmissionType.automatic,
        "color": "Синий", "city": "Душанбе",
        "description": "Hyundai Elantra нового поколения. Экономичная и надёжная.",
        "installment_available": True, "user_phone": "+992900000002",
        "photos": "hyundai",
    },
    {
        "type": ListingType.sale, "brand": "Hyundai", "model": "Santa Fe", "year": 2019,
        "price": 32000, "currency": Currency.USD, "mileage": 68000,
        "fuel": FuelType.diesel, "transmission": TransmissionType.automatic,
        "color": "Серый", "city": "Бохтар",
        "description": "Семейный кроссовер Hyundai Santa Fe. 7 мест, полный привод.",
        "installment_available": False, "user_phone": "+992900000001",
        "photos": "hyundai",
    },
    # --- Kia ---
    {
        "type": ListingType.sale, "brand": "Kia", "model": "Sportage", "year": 2023,
        "price": 31000, "currency": Currency.USD, "mileage": 8000,
        "fuel": FuelType.petrol, "transmission": TransmissionType.automatic,
        "color": "Белый", "city": "Душанбе",
        "description": "Kia Sportage 4-го поколения. На гарантии. Полный комплект.",
        "installment_available": True, "user_phone": "+992900000002",
        "photos": "kia",
    },
    {
        "type": ListingType.rent, "brand": "Kia", "model": "Rio", "year": 2022,
        "price": 35, "currency": Currency.USD, "mileage": 30000,
        "fuel": FuelType.petrol, "transmission": TransmissionType.automatic,
        "color": "Жёлтый", "city": "Хуҷанд",
        "description": "Kia Rio в аренду от 35 USD/день. Минимальный срок — 2 дня.",
        "installment_available": False, "user_phone": "+992900000001",
        "photos": "kia",
    },
    {
        "type": ListingType.sale, "brand": "Kia", "model": "K8", "year": 2022,
        "price": 40000, "currency": Currency.USD, "mileage": 20000,
        "fuel": FuelType.petrol, "transmission": TransmissionType.automatic,
        "color": "Чёрный", "city": "Кӯлоб",
        "description": "Kia K8 — флагманский седан. Люксовый интерьер, HiFi аудиосистема.",
        "installment_available": True, "user_phone": "+992900000002",
        "photos": "kia",
    },
    # --- Chevrolet ---
    {
        "type": ListingType.sale, "brand": "Chevrolet", "model": "Malibu", "year": 2020,
        "price": 15000, "currency": Currency.USD, "mileage": 60000,
        "fuel": FuelType.petrol, "transmission": TransmissionType.automatic,
        "color": "Серебристый", "city": "Душанбе",
        "description": "Chevrolet Malibu в хорошем состоянии. Недавняя замена масла и резины.",
        "installment_available": False, "user_phone": "+992900000001",
        "photos": "chevrolet",
    },
    {
        "type": ListingType.sale, "brand": "Chevrolet", "model": "Equinox", "year": 2021,
        "price": 22000, "currency": Currency.USD, "mileage": 38000,
        "fuel": FuelType.petrol, "transmission": TransmissionType.automatic,
        "color": "Синий", "city": "Хуҷанд",
        "description": "Chevrolet Equinox полный привод. Просторный багажник, тихая кабина.",
        "installment_available": True, "user_phone": "+992900000002",
        "photos": "chevrolet",
    },
    {
        "type": ListingType.sale, "brand": "Chevrolet", "model": "Tahoe", "year": 2022,
        "price": 85000, "currency": Currency.USD, "mileage": 12000,
        "fuel": FuelType.petrol, "transmission": TransmissionType.automatic,
        "color": "Чёрный", "city": "Душанбе",
        "description": "Chevrolet Tahoe High Country. Максимальная комплектация, 8 мест.",
        "installment_available": True, "user_phone": "+992900000002",
        "photos": "chevrolet",
    },
    {
        "type": ListingType.rent, "brand": "Chevrolet", "model": "Spark", "year": 2023,
        "price": 25, "currency": Currency.USD, "mileage": 10000,
        "fuel": FuelType.petrol, "transmission": TransmissionType.manual,
        "color": "Красный", "city": "Бохтар",
        "description": "Бюджетная аренда Chevrolet Spark. Отлично для города.",
        "installment_available": False, "user_phone": "+992900000001",
        "photos": "chevrolet",
    },
    {
        "type": ListingType.sale, "brand": "Chevrolet", "model": "Cobalt", "year": 2021,
        "price": 290000, "currency": Currency.TJS, "mileage": 45000,
        "fuel": FuelType.gas, "transmission": TransmissionType.manual,
        "color": "Белый", "city": "Кӯлоб",
        "description": "Chevrolet Cobalt, газ/бензин. Экономичный и неприхотливый.",
        "installment_available": False, "user_phone": "+992900000001",
        "photos": "chevrolet",
    },
]


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

def seed():
    # Ensure tables exist (for fresh dev environments)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("Seeding users...")
        user_map: dict[str, User] = {}
        for u in USERS:
            existing = db.query(User).filter(User.phone == u["phone"]).first()
            if existing:
                user_map[u["phone"]] = existing
                print(f"  Skipping existing user {u['phone']}")
                continue
            user = User(
                phone=u["phone"],
                name=u["name"],
                password_hash=hash_password(u["password"]),
                role=u["role"],
            )
            db.add(user)
            db.flush()
            user_map[u["phone"]] = user
            print(f"  Created {u['role']} user {u['phone']}")

        print("Seeding dealers...")
        for d in DEALERS:
            owner = user_map.get(d["user_phone"])
            if not owner:
                continue
            existing_dealer = db.query(Dealer).filter(Dealer.user_id == owner.id).first()
            if existing_dealer:
                print(f"  Skipping existing dealer {d['business_name']}")
                continue
            dealer = Dealer(
                user_id=owner.id,
                business_name=d["business_name"],
                city=d["city"],
                address=d["address"],
                phone=d["phone"],
                description=d["description"],
                verified=d["verified"],
            )
            db.add(dealer)

        db.flush()

        print("Seeding listings and images...")
        for idx, ld in enumerate(LISTINGS_DATA):
            user = user_map[ld["user_phone"]]
            listing = Listing(
                user_id=user.id,
                type=ld["type"],
                brand=ld["brand"],
                model=ld["model"],
                year=ld["year"],
                price=ld["price"],
                currency=ld["currency"],
                mileage=ld.get("mileage"),
                fuel=ld.get("fuel"),
                transmission=ld.get("transmission"),
                color=ld.get("color"),
                city=ld["city"],
                description=ld.get("description"),
                installment_available=ld.get("installment_available", False),
                is_dealer_listing=(user.role == UserRole.dealer),
                views=idx * 7,  # Simulate varied view counts for featured ordering
            )
            db.add(listing)
            db.flush()

            photos = _PHOTOS.get(ld["photos"], [])
            for i, url in enumerate(photos):
                image = ListingImage(
                    listing_id=listing.id,
                    url=url,
                    is_primary=(i == 0),
                    order_index=i,
                )
                db.add(image)

        db.commit()
        print(f"Done. Seeded {len(USERS)} users, {len(DEALERS)} dealers, {len(LISTINGS_DATA)} listings.")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
