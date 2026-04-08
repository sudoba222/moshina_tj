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
    Banner,
    Base,
    BodyType,
    Brand,
    CarModel,
    Currency,
    Dealer,
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
        "body_type": "sedan",
        "color": "Белый", "city": "Душанбе",
        "description": "Toyota Camry в отличном состоянии. Один хозяин, полный сервис у дилера.",
        "installment_available": True, "user_phone": "+992900000002",
        "photos": "toyota",
    },
    {
        "type": ListingType.sale, "brand": "Toyota", "model": "Land Cruiser 200", "year": 2019,
        "price": 68000, "currency": Currency.USD, "mileage": 75000,
        "fuel": FuelType.diesel, "transmission": TransmissionType.automatic,
        "body_type": "suv",
        "color": "Чёрный", "city": "Душанбе",
        "description": "Флагманский внедорожник Toyota. Полный привод, кожаный салон.",
        "installment_available": False, "user_phone": "+992900000002",
        "photos": "toyota",
    },
    {
        "type": ListingType.rent, "brand": "Toyota", "model": "Corolla", "year": 2022,
        "price": 50, "currency": Currency.USD, "mileage": 15000,
        "fuel": FuelType.petrol, "transmission": TransmissionType.automatic,
        "body_type": "sedan",
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
        "body_type": "sedan",
        "color": "Синий", "city": "Душанбе",
        "description": "BMW 520d xDrive, полный привод. Пакет M Sport. Все ТО у официального дилера.",
        "installment_available": True, "user_phone": "+992900000002",
        "photos": "bmw",
    },
    {
        "type": ListingType.sale, "brand": "BMW", "model": "X5", "year": 2018,
        "price": 55000, "currency": Currency.USD, "mileage": 90000,
        "fuel": FuelType.diesel, "transmission": TransmissionType.automatic,
        "body_type": "suv",
        "color": "Чёрный", "city": "Бохтар",
        "description": "BMW X5 40d, дизель. Панорамная крыша, вентиляция сидений.",
        "installment_available": False, "user_phone": "+992900000001",
        "photos": "bmw",
    },
    {
        "type": ListingType.rent, "brand": "BMW", "model": "3 Series", "year": 2021,
        "price": 80, "currency": Currency.USD, "mileage": 22000,
        "fuel": FuelType.petrol, "transmission": TransmissionType.automatic,
        "body_type": "sedan",
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
        "body_type": "sedan",
        "color": "Серебристый", "city": "Душанбе",
        "description": "Mercedes E200 AMG Line. Почти новый, на гарантии.",
        "installment_available": True, "user_phone": "+992900000002",
        "photos": "mercedes",
    },
    {
        "type": ListingType.sale, "brand": "Mercedes-Benz", "model": "GLE 350", "year": 2020,
        "price": 74000, "currency": Currency.USD, "mileage": 55000,
        "fuel": FuelType.petrol, "transmission": TransmissionType.automatic,
        "body_type": "suv",
        "color": "Чёрный", "city": "Кӯлоб",
        "description": "Mercedes GLE 350 4MATIC. Все опции, буксировочный крюк.",
        "installment_available": False, "user_phone": "+992900000001",
        "photos": "mercedes",
    },
    {
        "type": ListingType.rent, "brand": "Mercedes-Benz", "model": "C-Class", "year": 2023,
        "price": 100, "currency": Currency.USD, "mileage": 5000,
        "fuel": FuelType.petrol, "transmission": TransmissionType.automatic,
        "body_type": "sedan",
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
        "body_type": "suv",
        "color": "Красный", "city": "Хуҷанд",
        "description": "Hyundai Tucson Smart Plus. Климат-контроль, задняя камера, круиз.",
        "installment_available": True, "user_phone": "+992900000001",
        "photos": "hyundai",
    },
    {
        "type": ListingType.sale, "brand": "Hyundai", "model": "Elantra", "year": 2022,
        "price": 18500, "currency": Currency.USD, "mileage": 25000,
        "fuel": FuelType.petrol, "transmission": TransmissionType.automatic,
        "body_type": "sedan",
        "color": "Синий", "city": "Душанбе",
        "description": "Hyundai Elantra нового поколения. Экономичная и надёжная.",
        "installment_available": True, "user_phone": "+992900000002",
        "photos": "hyundai",
    },
    {
        "type": ListingType.sale, "brand": "Hyundai", "model": "Santa Fe", "year": 2019,
        "price": 32000, "currency": Currency.USD, "mileage": 68000,
        "fuel": FuelType.diesel, "transmission": TransmissionType.automatic,
        "body_type": "suv",
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
        "body_type": "suv",
        "color": "Белый", "city": "Душанбе",
        "description": "Kia Sportage 4-го поколения. На гарантии. Полный комплект.",
        "installment_available": True, "user_phone": "+992900000002",
        "photos": "kia",
    },
    {
        "type": ListingType.rent, "brand": "Kia", "model": "Rio", "year": 2022,
        "price": 35, "currency": Currency.USD, "mileage": 30000,
        "fuel": FuelType.petrol, "transmission": TransmissionType.automatic,
        "body_type": "sedan",
        "color": "Жёлтый", "city": "Хуҷанд",
        "description": "Kia Rio в аренду от 35 USD/день. Минимальный срок — 2 дня.",
        "installment_available": False, "user_phone": "+992900000001",
        "photos": "kia",
    },
    {
        "type": ListingType.sale, "brand": "Kia", "model": "K8", "year": 2022,
        "price": 40000, "currency": Currency.USD, "mileage": 20000,
        "fuel": FuelType.petrol, "transmission": TransmissionType.automatic,
        "body_type": "sedan",
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
        "body_type": "sedan",
        "color": "Серебристый", "city": "Душанбе",
        "description": "Chevrolet Malibu в хорошем состоянии. Недавняя замена масла и резины.",
        "installment_available": False, "user_phone": "+992900000001",
        "photos": "chevrolet",
    },
    {
        "type": ListingType.sale, "brand": "Chevrolet", "model": "Equinox", "year": 2021,
        "price": 22000, "currency": Currency.USD, "mileage": 38000,
        "fuel": FuelType.petrol, "transmission": TransmissionType.automatic,
        "body_type": "suv",
        "color": "Синий", "city": "Хуҷанд",
        "description": "Chevrolet Equinox полный привод. Просторный багажник, тихая кабина.",
        "installment_available": True, "user_phone": "+992900000002",
        "photos": "chevrolet",
    },
    {
        "type": ListingType.sale, "brand": "Chevrolet", "model": "Tahoe", "year": 2022,
        "price": 85000, "currency": Currency.USD, "mileage": 12000,
        "fuel": FuelType.petrol, "transmission": TransmissionType.automatic,
        "body_type": "suv",
        "color": "Чёрный", "city": "Душанбе",
        "description": "Chevrolet Tahoe High Country. Максимальная комплектация, 8 мест.",
        "installment_available": True, "user_phone": "+992900000002",
        "photos": "chevrolet",
    },
    {
        "type": ListingType.rent, "brand": "Chevrolet", "model": "Spark", "year": 2023,
        "price": 25, "currency": Currency.USD, "mileage": 10000,
        "fuel": FuelType.petrol, "transmission": TransmissionType.manual,
        "body_type": "hatchback",
        "color": "Красный", "city": "Бохтар",
        "description": "Бюджетная аренда Chevrolet Spark. Отлично для города.",
        "installment_available": False, "user_phone": "+992900000001",
        "photos": "chevrolet",
    },
    {
        "type": ListingType.sale, "brand": "Chevrolet", "model": "Cobalt", "year": 2021,
        "price": 290000, "currency": Currency.TJS, "mileage": 45000,
        "fuel": FuelType.gas, "transmission": TransmissionType.manual,
        "body_type": "sedan",
        "color": "Белый", "city": "Кӯлоб",
        "description": "Chevrolet Cobalt, газ/бензин. Экономичный и неприхотливый.",
        "installment_available": False, "user_phone": "+992900000001",
        "photos": "chevrolet",
    },
]


# ---------------------------------------------------------------------------
# Brands catalog
# ---------------------------------------------------------------------------

BRANDS_CATALOG = [
    # ── Japanese ─────────────────────────────────────────────
    {"name": "Toyota", "slug": "toyota", "country": "Япония", "is_popular": True, "models": [
        "Camry", "Corolla", "Land Cruiser 300", "Land Cruiser Prado", "RAV4", "Hilux",
        "Yaris", "Avalon", "C-HR", "Highlander", "Fortuner", "Rush", "Innova", "Vios",
    ]},
    {"name": "Honda", "slug": "honda", "country": "Япония", "is_popular": True, "models": [
        "Accord", "Civic", "CR-V", "HR-V", "Pilot", "Odyssey", "Fit", "Jazz", "Passport",
    ]},
    {"name": "Nissan", "slug": "nissan", "country": "Япония", "is_popular": True, "models": [
        "Sentra", "Altima", "X-Trail", "Patrol", "Murano", "Note", "Juke", "Qashqai",
        "Kicks", "Teana", "Tiida", "Pathfinder", "Navara",
    ]},
    {"name": "Mitsubishi", "slug": "mitsubishi", "country": "Япония", "is_popular": False, "models": [
        "Lancer", "Outlander", "Eclipse Cross", "Pajero", "Pajero Sport", "L200",
        "ASX", "Galant", "Grandis",
    ]},
    {"name": "Mazda", "slug": "mazda", "country": "Япония", "is_popular": False, "models": [
        "Mazda 3", "Mazda 6", "CX-5", "CX-9", "CX-30", "MX-5", "CX-50",
    ]},
    {"name": "Subaru", "slug": "subaru", "country": "Япония", "is_popular": False, "models": [
        "Forester", "Outback", "Impreza", "XV", "Legacy", "WRX", "BRZ", "Ascent",
    ]},
    {"name": "Lexus", "slug": "lexus", "country": "Япония", "is_popular": True, "models": [
        "IS", "ES", "RX", "NX", "GX", "LX", "LS", "UX", "RC",
    ]},
    {"name": "Infiniti", "slug": "infiniti", "country": "Япония", "is_popular": False, "models": [
        "Q50", "Q60", "QX50", "QX60", "QX80", "G35", "FX35",
    ]},
    {"name": "Suzuki", "slug": "suzuki", "country": "Япония", "is_popular": False, "models": [
        "Vitara", "Swift", "Jimny", "SX4", "Grand Vitara", "Ciaz", "Ignis",
    ]},
    # ── Korean ───────────────────────────────────────────────
    {"name": "Hyundai", "slug": "hyundai", "country": "Корея", "is_popular": True, "models": [
        "Tucson", "Elantra", "Santa Fe", "Sonata", "Creta", "Accent", "i30",
        "Palisade", "Ioniq 5", "Ioniq 6", "Venue", "Kona", "Grandeur",
    ]},
    {"name": "Kia", "slug": "kia", "country": "Корея", "is_popular": True, "models": [
        "Sportage", "Sorento", "K5", "K8", "Rio", "Carnival", "Stinger",
        "Telluride", "EV6", "Seltos", "Niro", "Cerato", "Cadenza",
    ]},
    {"name": "Genesis", "slug": "genesis", "country": "Корея", "is_popular": False, "models": [
        "G80", "G90", "GV80", "GV70", "G70",
    ]},
    {"name": "SsangYong", "slug": "ssangyong", "country": "Корея", "is_popular": False, "models": [
        "Rexton", "Tivoli", "Korando", "Musso",
    ]},
    # ── German ───────────────────────────────────────────────
    {"name": "BMW", "slug": "bmw", "country": "Германия", "is_popular": True, "models": [
        "3 Series", "5 Series", "7 Series", "X3", "X5", "X6", "X7",
        "M3", "M5", "1 Series", "2 Series", "4 Series", "6 Series",
        "X1", "X2", "X4", "iX", "i4", "i7",
    ]},
    {"name": "Mercedes-Benz", "slug": "mercedes-benz", "country": "Германия", "is_popular": True, "models": [
        "C-Class", "E-Class", "S-Class", "GLE", "GLC", "GLS", "GLA",
        "A-Class", "CLA", "CLS", "AMG GT", "G-Class", "GLB", "EQS",
    ]},
    {"name": "Audi", "slug": "audi", "country": "Германия", "is_popular": True, "models": [
        "A3", "A4", "A6", "A8", "Q3", "Q5", "Q7", "Q8",
        "RS6", "RS3", "TT", "e-tron", "A5", "A7",
    ]},
    {"name": "Volkswagen", "slug": "volkswagen", "country": "Германия", "is_popular": True, "models": [
        "Golf", "Passat", "Tiguan", "Touareg", "Jetta", "Polo",
        "Arteon", "Touran", "T-Roc", "ID.4", "Phaeton",
    ]},
    {"name": "Porsche", "slug": "porsche", "country": "Германия", "is_popular": False, "models": [
        "Cayenne", "Macan", "Panamera", "911", "Taycan", "Boxster",
    ]},
    {"name": "Opel", "slug": "opel", "country": "Германия", "is_popular": False, "models": [
        "Astra", "Insignia", "Mokka", "Crossland", "Grandland",
    ]},
    # ── American ─────────────────────────────────────────────
    {"name": "Chevrolet", "slug": "chevrolet", "country": "США", "is_popular": True, "models": [
        "Malibu", "Equinox", "Tahoe", "Spark", "Cobalt", "Traverse",
        "Trailblazer", "Captiva", "Blazer", "Silverado", "Camaro",
    ]},
    {"name": "Ford", "slug": "ford", "country": "США", "is_popular": True, "models": [
        "Focus", "Mondeo", "Explorer", "F-150", "Ranger", "Mustang",
        "Edge", "Kuga", "Escape", "Bronco", "Expedition",
    ]},
    {"name": "Jeep", "slug": "jeep", "country": "США", "is_popular": False, "models": [
        "Wrangler", "Cherokee", "Grand Cherokee", "Renegade", "Compass", "Gladiator",
    ]},
    {"name": "Cadillac", "slug": "cadillac", "country": "США", "is_popular": False, "models": [
        "Escalade", "XT5", "XT6", "CT5", "CT4",
    ]},
    {"name": "Lincoln", "slug": "lincoln", "country": "США", "is_popular": False, "models": [
        "Navigator", "Aviator", "Corsair", "Nautilus",
    ]},
    # ── French ───────────────────────────────────────────────
    {"name": "Renault", "slug": "renault", "country": "Франция", "is_popular": True, "models": [
        "Logan", "Sandero", "Duster", "Clio", "Megane", "Koleos",
        "Captur", "Kadjar", "Talisman", "Arkana",
    ]},
    {"name": "Peugeot", "slug": "peugeot", "country": "Франция", "is_popular": False, "models": [
        "208", "308", "508", "2008", "3008", "5008", "4008",
    ]},
    {"name": "Citroen", "slug": "citroen", "country": "Франция", "is_popular": False, "models": [
        "C3", "C4", "C5", "C3 Aircross", "C5 Aircross", "Berlingo",
    ]},
    # ── Czech / Swedish / British ─────────────────────────────
    {"name": "Skoda", "slug": "skoda", "country": "Чехия", "is_popular": True, "models": [
        "Octavia", "Superb", "Kodiaq", "Karoq", "Fabia", "Scala", "Enyaq",
    ]},
    {"name": "Volvo", "slug": "volvo", "country": "Швеция", "is_popular": False, "models": [
        "XC60", "XC90", "S60", "S90", "V60", "V90", "C40",
    ]},
    {"name": "Land Rover", "slug": "land-rover", "country": "Великобритания", "is_popular": False, "models": [
        "Range Rover", "Range Rover Sport", "Discovery", "Defender", "Freelander", "Evoque",
    ]},
    {"name": "MINI", "slug": "mini", "country": "Великобритания", "is_popular": False, "models": [
        "Cooper", "Countryman", "Clubman", "Paceman",
    ]},
    # ── Italian ───────────────────────────────────────────────
    {"name": "Fiat", "slug": "fiat", "country": "Италия", "is_popular": False, "models": [
        "Punto", "Tipo", "500", "Panda", "Bravo", "500X",
    ]},
    {"name": "Alfa Romeo", "slug": "alfa-romeo", "country": "Италия", "is_popular": False, "models": [
        "Giulia", "Stelvio", "Tonale", "Giulietta", "159",
    ]},
    # ── Chinese (very important for Tajikistan) ────────────────
    {"name": "Chery", "slug": "chery", "country": "Китай", "is_popular": True, "models": [
        "Tiggo 3", "Tiggo 4", "Tiggo 4 Pro", "Tiggo 7 Pro", "Tiggo 8 Pro",
        "Arrizo 5", "Arrizo 6", "Arrizo 8", "QQ",
    ]},
    {"name": "Geely", "slug": "geely", "country": "Китай", "is_popular": True, "models": [
        "Atlas", "Atlas Pro", "Coolray", "Tugella", "Emgrand",
        "Monjaro", "Okavango", "Boyue", "Binray",
    ]},
    {"name": "Haval", "slug": "haval", "country": "Китай", "is_popular": True, "models": [
        "H2", "H6", "H9", "Jolion", "F7", "F7x", "Dargo", "H6 HEV",
    ]},
    {"name": "BYD", "slug": "byd", "country": "Китай", "is_popular": True, "models": [
        "Tang", "Han", "Song", "Seal", "Dolphin", "Yuan Plus", "Atto 3",
        "Song Plus", "Song Pro", "F3",
    ]},
    {"name": "Changan", "slug": "changan", "country": "Китай", "is_popular": True, "models": [
        "CS35 Plus", "CS55 Plus", "CS75 Plus", "CS85", "Alsvin",
        "Uni-T", "Uni-K", "Uni-V", "Lamore",
    ]},
    {"name": "FAW", "slug": "faw", "country": "Китай", "is_popular": False, "models": [
        "Bestune T77", "Bestune T99", "Bestune B70", "Oley", "Vita",
    ]},
    {"name": "JAC", "slug": "jac", "country": "Китай", "is_popular": False, "models": [
        "S3", "S4", "S7", "J7", "T8", "Sei 7",
    ]},
    {"name": "Great Wall", "slug": "great-wall", "country": "Китай", "is_popular": False, "models": [
        "Wingle 7", "Poer", "Gun",
    ]},
    {"name": "Omoda", "slug": "omoda", "country": "Китай", "is_popular": False, "models": [
        "C5",
    ]},
    {"name": "EXEED", "slug": "exeed", "country": "Китай", "is_popular": False, "models": [
        "TXL", "VX", "LX", "RX",
    ]},
    {"name": "Jetour", "slug": "jetour", "country": "Китай", "is_popular": False, "models": [
        "X70", "X90", "X95", "Dashing", "T2",
    ]},
    {"name": "Lifan", "slug": "lifan", "country": "Китай", "is_popular": False, "models": [
        "X60", "X70", "530", "620",
    ]},
    {"name": "BAIC", "slug": "baic", "country": "Китай", "is_popular": False, "models": [
        "X35", "X55", "BJ40", "U5 Plus",
    ]},
    {"name": "Dongfeng", "slug": "dongfeng", "country": "Китай", "is_popular": False, "models": [
        "AX7 Pro", "AX4", "S560", "E70",
    ]},
    {"name": "MG", "slug": "mg", "country": "Китай", "is_popular": True, "models": [
        "MG5", "MG6", "HS", "ZS", "RX5", "4", "One",
    ]},
    {"name": "Deepal", "slug": "deepal", "country": "Китай", "is_popular": False, "models": [
        "S07", "L07",
    ]},
    # ── Russian ───────────────────────────────────────────────
    {"name": "LADA", "slug": "lada", "country": "Россия", "is_popular": True, "models": [
        "Granta", "Vesta", "XRAY", "Niva Legend", "Niva Travel", "Largus",
        "Kalina", "Priora", "2107", "2106", "2105", "2114", "2115",
    ]},
    {"name": "UAZ", "slug": "uaz", "country": "Россия", "is_popular": True, "models": [
        "Patriot", "Hunter", "Pickup", "452 (Буханка)", "Profesional",
    ]},
    {"name": "GAZ", "slug": "gaz", "country": "Россия", "is_popular": False, "models": [
        "Gazelle Next", "Sobol NN", "Volga Siber",
    ]},
    {"name": "Moskvich", "slug": "moskvich", "country": "Россия", "is_popular": False, "models": [
        "3", "6",
    ]},
]


def seed_catalog(db):
    for b_data in BRANDS_CATALOG:
        existing = db.query(Brand).filter(Brand.name == b_data["name"]).first()
        if existing:
            brand_obj = existing
        else:
            brand_obj = Brand(
                name=b_data["name"],
                slug=b_data["slug"],
                country=b_data.get("country"),
                is_popular=b_data.get("is_popular", False),
                is_active=True,
            )
            db.add(brand_obj)
            db.flush()
        for model_name in b_data.get("models", []):
            exists = db.query(CarModel).filter(
                CarModel.brand_id == brand_obj.id,
                CarModel.name == model_name,
            ).first()
            if not exists:
                db.add(CarModel(brand_id=brand_obj.id, name=model_name, is_active=True))
    db.commit()
    print(f"  Seeded {len(BRANDS_CATALOG)} brands")


BANNERS_DATA = [
    {
        "title_ru": "Купите авто мечты в рассрочку",
        "title_tj": "Мошинаи орзӯии худро бо қарз харед",
        "subtitle_ru": "Ставки от 15% годовых · Срок до 60 месяцев",
        "subtitle_tj": "Фоизҳо аз 15% дар сол · То 60 моҳ",
        "image_url": "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1400&q=80",
        "link_url": "/installment",
        "display_order": 1,
        "is_active": True,
    },
    {
        "title_ru": "Продайте авто быстро и выгодно",
        "title_tj": "Мошинаро зуд ва фоиданок фурӯшед",
        "subtitle_ru": "Бесплатное размещение · Тысячи покупателей",
        "subtitle_tj": "Ҷойгиркунии ройгон · Ҳазорон харидор",
        "image_url": "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1400&q=80",
        "link_url": "/post",
        "display_order": 2,
        "is_active": True,
    },
    {
        "title_ru": "Аренда автомобилей по Таджикистану",
        "title_tj": "Иҷораи мошинҳо дар Тоҷикистон",
        "subtitle_ru": "Более 50 автомобилей · От 25 USD в день",
        "subtitle_tj": "Зиёда аз 50 мошин · Аз 25 USD дар рӯз",
        "image_url": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1400&q=80",
        "link_url": "/rent",
        "display_order": 3,
        "is_active": True,
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
                body_type=BodyType(ld["body_type"]) if ld.get("body_type") else None,
                color=ld.get("color"),
                city=ld["city"],
                description=ld.get("description"),
                installment_available=ld.get("installment_available", False),
                is_dealer_listing=(user.role == UserRole.dealer),
                views=idx * 7,  # Simulate varied view counts for featured ordering
                status=ListingStatus.active,  # Seeds bypass moderation — activate immediately
                is_active=True,
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

        print("Seeding banners...")
        for b_data in BANNERS_DATA:
            existing = db.query(Banner).filter(Banner.title_ru == b_data["title_ru"]).first()
            if existing:
                print(f"  Skipping existing banner: {b_data['title_ru']}")
                continue
            banner = Banner(**b_data)
            db.add(banner)
        print(f"  Seeded {len(BANNERS_DATA)} banners")

        db.commit()
        print(f"Done. Seeded {len(USERS)} users, {len(DEALERS)} dealers, {len(LISTINGS_DATA)} listings.")

        print("Seeding catalog (brands & models)...")
        seed_catalog(db)

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    if os.getenv("ENVIRONMENT", "development") == "production":
        print("ERROR: Do not run seeds in production! Aborting.")
        sys.exit(1)
    print(
        "WARNING: Seed passwords (tajcar123) are insecure placeholders. "
        "This script is for development environments only."
    )
    seed()
