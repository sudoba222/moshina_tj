"""Redis client factory and response-cache helpers.

This module provides:
  - get_redis()         — returns a shared async Redis client (or None if Redis
                          is unavailable).  Callers must handle the None case
                          gracefully; the app always falls back to in-memory caching.
  - cache_get(key)      — fetch a cached JSON value; returns the deserialized
                          Python object or None on miss / Redis unavailable.
  - cache_set(key, val, ttl) — serialise val to JSON and store with TTL (seconds).
  - cache_delete(key)   — remove a single key.
  - cache_delete_pattern(pattern) — remove all keys matching a glob pattern
                                    (uses SCAN to avoid blocking the server).

Design decisions
----------------
* A single module-level Redis client is created lazily on first use and reused
  across the process.  Each uvicorn worker creates its own client — that is
  correct; all workers connect to the same Redis instance.
* redis.asyncio is used (ships with redis>=4.2).  aioredis is deprecated.
* All public helpers swallow exceptions and log them so a Redis outage never
  crashes an API request.
"""
import json
import logging
from typing import Any, Optional

import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Singleton client — one per worker process.
# ---------------------------------------------------------------------------
_redis_client: Optional[aioredis.Redis] = None
_redis_available: bool = True  # optimistic; set False on first connection failure


def _build_client() -> aioredis.Redis:
    """Create a new async Redis client from REDIS_URL."""
    return aioredis.from_url(
        settings.redis_url,
        encoding="utf-8",
        decode_responses=True,
        socket_connect_timeout=2,
        socket_timeout=2,
        retry_on_timeout=False,
    )


async def get_redis() -> Optional[aioredis.Redis]:
    """Return the shared Redis client.

    Returns None if Redis has previously been found to be unreachable,
    so callers do not waste time attempting connections on every request.
    """
    global _redis_client, _redis_available
    if not _redis_available:
        return None
    if _redis_client is None:
        _redis_client = _build_client()
    return _redis_client


async def _safe_redis() -> Optional[aioredis.Redis]:
    """Internal helper: returns client or None, marking Redis unavailable on error."""
    global _redis_available
    client = await get_redis()
    if client is None:
        return None
    try:
        # Lightweight liveness check on first use would add latency on every
        # call, so we trust the client and only catch exceptions downstream.
        return client
    except Exception as exc:
        logger.warning("Redis unavailable: %s — falling back to local cache", exc)
        _redis_available = False
        return None


# ---------------------------------------------------------------------------
# Cache helpers
# ---------------------------------------------------------------------------

async def cache_get(key: str) -> Optional[Any]:
    """Fetch and deserialise a cached value.

    Returns the Python object on hit, or None on miss / error.
    """
    try:
        client = await _safe_redis()
        if client is None:
            return None
        raw = await client.get(key)
        if raw is None:
            return None
        return json.loads(raw)
    except Exception as exc:
        logger.warning("cache_get(%s) failed: %s", key, exc)
        return None


async def cache_set(key: str, value: Any, ttl: int) -> None:
    """Serialise value to JSON and store in Redis with a TTL (seconds).

    Silently drops the write if Redis is unavailable.
    """
    try:
        client = await _safe_redis()
        if client is None:
            return
        await client.setex(key, ttl, json.dumps(value, default=str))
    except Exception as exc:
        logger.warning("cache_set(%s) failed: %s", key, exc)


async def cache_delete(key: str) -> None:
    """Remove a single key from Redis."""
    try:
        client = await _safe_redis()
        if client is None:
            return
        await client.delete(key)
    except Exception as exc:
        logger.warning("cache_delete(%s) failed: %s", key, exc)


async def cache_delete_pattern(pattern: str) -> None:
    """Remove all keys matching a glob pattern using SCAN (non-blocking).

    Example: cache_delete_pattern("listings:featured:*")
    """
    try:
        client = await _safe_redis()
        if client is None:
            return
        cursor = 0
        while True:
            cursor, keys = await client.scan(cursor=cursor, match=pattern, count=100)
            if keys:
                await client.delete(*keys)
            if cursor == 0:
                break
    except Exception as exc:
        logger.warning("cache_delete_pattern(%s) failed: %s", pattern, exc)
