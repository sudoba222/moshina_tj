"""
Seed the top-level marketplace categories as requested by the user.
Run from moshina-tj/backend directory:
    python seed_categories.py
"""
import os
import sys
import uuid

# Make app importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from app.database import SessionLocal
from app.models import Category

MARKETPLACE_CATEGORIES = [
    {
        "name_ru": "Легковые автомобили",
        "name_tj": "Мошинҳои сабукрав",
        "slug": "cars",
        "display_order": 1,
    },
    {
        "name_ru": "Мото транспорт",
        "name_tj": "Мото транспорт",
        "slug": "moto",
        "display_order": 2,
    },
    {
        "name_ru": "Коммерческий транспорт",
        "name_tj": "Транспорти тиҷоратӣ",
        "slug": "commercial",
        "display_order": 3,
    },
    {
        "name_ru": "Прицепы и контейнеры",
        "name_tj": "Прицепҳо ва контейнерҳо",
        "slug": "trailers",
        "display_order": 4,
    },
    {
        "name_ru": "Запчасти и принадлежности",
        "name_tj": "Қисмҳои эҳтиётӣ ва лавозимот",
        "slug": "spare-parts",
        "display_order": 5,
    },
    {
        "name_ru": "Автосервис и ремонт",
        "name_tj": "Автосервис ва таъмир",
        "slug": "service",
        "display_order": 6,
    },
    {
        "name_ru": "Другой транспорт",
        "name_tj": "Дигар транспорт",
        "slug": "other-transport",
        "display_order": 7,
    },
]

def seed():
    db = SessionLocal()
    try:
        print("Seeding marketplace categories...")
        for cat_data in MARKETPLACE_CATEGORIES:
            existing = db.query(Category).filter(Category.slug == cat_data["slug"]).first()
            if existing:
                print(f"  Category '{cat_data['name_ru']}' already exists, skipping.")
                continue
            
            cat = Category(
                name_ru=cat_data["name_ru"],
                name_tj=cat_data["name_tj"],
                slug=cat_data["slug"],
                display_order=cat_data["display_order"],
                is_active=True
            )
            db.add(cat)
            print(f"  Created category '{cat_data['name_ru']}'")
        
        db.commit()
        print("Done.")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed()
