from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,          # Detect stale connections before use
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,             # Raise after 30s waiting for a connection (default is 30s, explicit is better)
    pool_recycle=1800,           # Recycle connections after 30 min — prevents "server closed the connection" on idle servers
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a database session and guarantees cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
