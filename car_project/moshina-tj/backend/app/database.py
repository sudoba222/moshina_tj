from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,          # Detect stale connections before use
    pool_size=20,                # Raised from 10: synchronous handlers hold connections for full request duration
    max_overflow=30,             # Raised from 20: burst headroom for 1000+ concurrent users
    pool_timeout=30,             # Raise after 30s waiting for a connection
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
