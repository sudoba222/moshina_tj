import sys
from sqlalchemy import create_engine, text

def fix_db(db_url):
    try:
        # Ensure the URL is SQLAlchemy compatible
        if db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql://", 1)
            
        engine = create_engine(db_url)
        with engine.connect() as conn:
            # This resets the version label in the database to the last stable version
            conn.execute(text("UPDATE alembic_version SET version_num='20260410_1200'"))
            conn.commit()
        print("\n✅ Success! Production database stamped back to stable version.")
        print("Now restart your Coolify container and it will start normally.")
    except Exception as e:
        print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 fix_prod_db.py 'YOUR_DATABASE_URL'")
    else:
        fix_db(sys.argv[1])
