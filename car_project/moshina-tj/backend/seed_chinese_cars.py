"""
seed_chinese_cars.py — Seed Chinese and EV car brands + models.

Idempotent: brands are looked up by slug before insert; existing ones are skipped.
Car models use ON CONFLICT DO NOTHING against the (brand_id, name) unique constraint.

Run from moshina-tj/backend/:
    source venv/bin/activate
    python seed_chinese_cars.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL is not set. Check your .env file.")
    sys.exit(1)

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

# ---------------------------------------------------------------------------
# Seed data — popular Chinese and EV brands in Central Asia / Tajikistan
# ---------------------------------------------------------------------------

CHINESE_EV_BRANDS = [
    {
        "name": "BYD",
        "slug": "byd",
        "country": "China",
        "is_popular": True,
        "models": [
            "Han", "Tang", "Song Plus", "Song Pro", "Seal",
            "Atto 3", "Dolphin", "Seagull", "Yuan Plus", "Destroyer 05",
        ],
    },
    {
        "name": "Chery",
        "slug": "chery",
        "country": "China",
        "is_popular": True,
        "models": [
            "Tiggo 4 Pro", "Tiggo 7 Pro", "Tiggo 8 Pro",
            "Tiggo 4", "Arrizo 5", "Arrizo 8",
        ],
    },
    {
        "name": "Geely",
        "slug": "geely",
        "country": "China",
        "is_popular": True,
        "models": [
            "Atlas", "Atlas Pro", "Coolray", "Tugella",
            "Emgrand", "Monjaro", "Preface",
        ],
    },
    {
        "name": "Haval",
        "slug": "haval",
        "country": "China",
        "is_popular": True,
        "models": ["H6", "F7", "F7x", "Jolion", "H9", "Dargo"],
    },
    {
        "name": "Li Auto",
        "slug": "li-auto",
        "country": "China",
        "is_popular": True,
        "models": ["L6", "L7", "L8", "L9", "MEGA"],
    },
    {
        "name": "Zeekr",
        "slug": "zeekr",
        "country": "China",
        "is_popular": True,
        "models": ["001", "007", "009", "X"],
    },
    {
        "name": "Jetour",
        "slug": "jetour",
        "country": "China",
        "is_popular": True,
        "models": ["X70", "X70 Plus", "X90", "Dashing", "T2"],
    },
    {
        "name": "Hongqi",
        "slug": "hongqi",
        "country": "China",
        "is_popular": False,
        "models": ["H5", "H9", "E-HS9", "HS5"],
    },
    {
        "name": "Omoda",
        "slug": "omoda",
        "country": "China",
        "is_popular": True,
        "models": ["C5", "S5"],
    },
    {
        "name": "Changan",
        "slug": "changan",
        "country": "China",
        "is_popular": True,
        "models": [
            "CS35 Plus", "CS55 Plus", "CS75 Plus",
            "UNI-T", "UNI-K", "Lamore",
        ],
    },
    {
        "name": "JAC",
        "slug": "jac",
        "country": "China",
        "is_popular": False,
        "models": ["JS4", "JS6", "T6", "T8"],
    },
    {
        "name": "DFSK",
        "slug": "dfsk",
        "country": "China",
        "is_popular": False,
        "models": ["Glory 500", "Glory 580", "Glory 560"],
    },
    {
        "name": "Tesla",
        "slug": "tesla",
        "country": "USA",
        "is_popular": True,
        "models": ["Model 3", "Model Y", "Model S", "Model X", "Cybertruck"],
    },
    {
        "name": "Lixiang",
        "slug": "lixiang",
        "country": "China",
        "is_popular": False,
        "models": ["L6", "L7", "L8", "L9"],
    },
]


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

def seed() -> None:
    db = Session()
    added_brands = 0
    added_models = 0
    skipped = 0

    try:
        for brand_data in CHINESE_EV_BRANDS:
            # Check existence by slug (idempotent guard)
            existing = db.execute(
                text("SELECT id FROM brands WHERE slug = :slug"),
                {"slug": brand_data["slug"]},
            ).fetchone()

            if existing:
                print(f"  SKIP {brand_data['name']} (already exists)")
                skipped += 1
                continue

            # Insert brand — let the DB generate the UUID via server_default
            result = db.execute(
                text("""
                    INSERT INTO brands (name, slug, country, is_popular)
                    VALUES (:name, :slug, :country, :is_popular)
                    RETURNING id
                """),
                {
                    "name": brand_data["name"],
                    "slug": brand_data["slug"],
                    "country": brand_data["country"],
                    "is_popular": brand_data["is_popular"],
                },
            )
            brand_id = result.fetchone()[0]

            # Insert models — ON CONFLICT DO NOTHING protects against (brand_id, name) dupes
            model_count = 0
            for model_name in brand_data["models"]:
                db.execute(
                    text("""
                        INSERT INTO car_models (brand_id, name)
                        VALUES (:brand_id, :name)
                        ON CONFLICT ON CONSTRAINT uq_brand_model DO NOTHING
                    """),
                    {"brand_id": brand_id, "name": model_name},
                )
                model_count += 1

            added_models += model_count
            added_brands += 1
            print(f"  ADD  {brand_data['name']} ({model_count} models)")

        db.commit()

    except Exception as exc:
        db.rollback()
        print(f"\nERROR: {exc}")
        raise
    finally:
        db.close()

    print(
        f"\nDone: {added_brands} brand(s) added, "
        f"{added_models} model(s) added, "
        f"{skipped} skipped."
    )


if __name__ == "__main__":
    seed()
