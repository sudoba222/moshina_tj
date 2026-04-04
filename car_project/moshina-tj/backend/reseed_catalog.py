"""
reseed_catalog.py — Clear brands/models and re-seed from seeds.py.
"""
import os
import sys

# Make app importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.database import SessionLocal
from app.models import Brand, CarModel
from seeds import BRANDS_CATALOG, seed_catalog

def reseed():
    db = SessionLocal()
    try:
        print("Truncating brands and car_models...")
        db.execute(text("TRUNCATE TABLE brands, car_models CASCADE"))
        db.commit()
        print("  Cleared.")

        print("Seeding from BRANDS_CATALOG in seeds.py...")
        seed_catalog(db)
        print("Done.")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    reseed()
