"""Gunicorn configuration for production deployments.

Usage:
    gunicorn app.main:app -c gunicorn.conf.py

Environment overrides:
    WEB_CONCURRENCY   — number of worker processes (default: 4)
    GUNICORN_TIMEOUT  — worker timeout in seconds (default: 60)

With 4 workers and worker_connections=1000 this configuration can handle
~4 000 concurrent connections per pod.  Scale horizontally (more pods) +
use Redis pub/sub (already wired in app/websockets.py) for WebSocket fan-out
across workers.
"""
import os

# ---------------------------------------------------------------------------
# Binding
# ---------------------------------------------------------------------------
bind = "0.0.0.0:8000"

# ---------------------------------------------------------------------------
# Workers
# ---------------------------------------------------------------------------
# UvicornWorker gives each Gunicorn worker a full asyncio event loop, which
# is required for FastAPI's async endpoints and WebSocket support.
worker_class = "uvicorn.workers.UvicornWorker"

# Default to 4 workers; override with WEB_CONCURRENCY in the environment.
# Rule of thumb: (2 × CPU cores) + 1.  Hetzner CCX22 has 4 vCPUs → 4 works.
workers = int(os.environ.get("WEB_CONCURRENCY", 4))

# Max simultaneous connections per worker (uvicorn async model handles these
# as coroutines, not threads, so this is safe at 1000).
worker_connections = 1000

# ---------------------------------------------------------------------------
# Timeouts
# ---------------------------------------------------------------------------
# Time (seconds) a worker may be silent before being killed and restarted.
# WebSocket connections are long-lived — Gunicorn's timeout only applies to
# the initial HTTP upgrade; the WS loop keeps the worker "active".
timeout = int(os.environ.get("GUNICORN_TIMEOUT", 60))

# Time (seconds) to wait for workers to finish in-flight requests on SIGTERM.
graceful_timeout = 30

# Seconds to wait for the next request on a Keep-Alive connection.
keepalive = 5

# ---------------------------------------------------------------------------
# Worker recycling — prevents slow memory leaks from accumulating indefinitely.
# ---------------------------------------------------------------------------
# Restart a worker after it has served this many requests (± jitter).
max_requests = 1000
max_requests_jitter = 100

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
# Use "-" to send access logs to stdout (captured by Docker / Coolify).
accesslog = "-"
errorlog = "-"
loglevel = "info"

# Log format: timestamp | method | path | status | response-time
access_log_format = '%(t)s "%(r)s" %(s)s %(b)s %(L)ss'
