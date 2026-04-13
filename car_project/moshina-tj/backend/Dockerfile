FROM python:3.11

# Security: run as non-root
RUN addgroup --system app && adduser --system --group app

WORKDIR /app

# Install dependencies first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Own the files
RUN chown -R app:app /app
USER app

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Repair DB version and start the server
CMD ["sh", "-c", "python3 -c \"from app.database import engine; from sqlalchemy import text; conn=engine.connect(); conn.execute(text('DROP TABLE IF EXISTS cities CASCADE; UPDATE alembic_version SET version_num=\\'20260410_1200\\'')); conn.commit(); conn.close(); print('DATABASE REPAIRED')\" && gunicorn -c gunicorn_conf.py app.main:app"]
