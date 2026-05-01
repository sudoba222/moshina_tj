"""WebSocket connection manager with Redis pub/sub fan-out.

Architecture
------------
Each uvicorn worker keeps its own in-memory dict of active WebSocket connections.
When a message must be delivered to a user, two things happen:

  1. If that user is connected to *this* worker, the message is sent directly
     over the local WebSocket.
  2. The message is also published to the Redis channel ``ws:user:<user_id>``
     so that workers that hold connections for that user (on a different pod or
     process) will receive and forward it.

A long-lived asyncio background task per worker subscribes to the Redis pub/sub
bus.  When a message arrives on a channel the task looks up local connections
for that user_id and forwards the payload.

Graceful degradation
--------------------
If Redis is unavailable (``get_redis()`` returns None), the manager silently
falls back to local-only broadcast.  This is correct for single-worker dev
environments and prevents a Redis outage from taking down chat entirely in
production (users connected to the same worker still communicate; cross-worker
delivery is lost until Redis recovers).
"""
import asyncio
import json
import logging
from collections import defaultdict
from typing import DefaultDict, Optional, Set

from fastapi import WebSocket

from app.redis_client import get_redis

logger = logging.getLogger(__name__)

# Redis channel prefix for per-user delivery.
_USER_CHANNEL_PREFIX = "ws:user:"


class ConnectionManager:
    """Manages per-worker WebSocket connections and Redis pub/sub subscription."""

    def __init__(self) -> None:
        # user_id (str) -> set of active WebSocket connections on this worker
        self.active: DefaultDict[str, list[WebSocket]] = defaultdict(list)

        # Track which user_ids we currently have an active Redis subscription for.
        # Key: user_id, Value: asyncio.Task running the per-user listener.
        self._redis_listeners: dict[str, asyncio.Task] = {}

    # ------------------------------------------------------------------
    # Connection lifecycle
    # ------------------------------------------------------------------

    async def connect(self, websocket: WebSocket, user_id: str) -> None:
        await websocket.accept()
        self.active[user_id].append(websocket)
        logger.info(
            "WS connected: user_id=%s total_local_connections=%d",
            user_id,
            len(self.active[user_id]),
        )
        # Start a Redis listener for this user if not already running.
        await self._ensure_redis_listener(user_id)

    def disconnect(self, websocket: WebSocket, user_id: str) -> None:
        self.active[user_id] = [ws for ws in self.active[user_id] if ws is not websocket]
        if not self.active[user_id]:
            del self.active[user_id]
            # No more local connections for this user — cancel the Redis listener.
            self._cancel_redis_listener(user_id)
        logger.info("WS disconnected: user_id=%s", user_id)

    # ------------------------------------------------------------------
    # Sending messages
    # ------------------------------------------------------------------

    async def send_to_user(self, user_id: str, payload: dict) -> None:
        """Send a JSON payload to all local connections of user_id AND publish
        to the Redis channel so remote workers can forward it too.

        Call this instead of writing directly to websockets.
        """
        serialised = json.dumps(payload)

        # 1. Deliver to locally connected sockets.
        await self._send_local(user_id, serialised)

        # 2. Publish to Redis so other workers can forward it.
        await self._publish_redis(user_id, serialised)

    async def _send_local(self, user_id: str, serialised: str) -> None:
        """Forward a pre-serialised payload to all local sockets for user_id."""
        dead: list[WebSocket] = []
        for ws in list(self.active.get(user_id, [])):
            try:
                await ws.send_text(serialised)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, user_id)

    async def _publish_redis(self, user_id: str, serialised: str) -> None:
        """Publish serialised payload to the Redis pub/sub channel for user_id."""
        try:
            client = await get_redis()
            if client is None:
                return
            channel = f"{_USER_CHANNEL_PREFIX}{user_id}"
            await client.publish(channel, serialised)
        except Exception as exc:
            # Redis publish failure must never crash a chat message send.
            logger.warning("Redis publish failed for user_id=%s: %s", user_id, exc)

    def is_online(self, user_id: str) -> bool:
        """Return True if this worker has at least one active connection for user_id.

        Note: in a multi-worker setup, a user may be online on a *different*
        worker even if this returns False.  The REST send_message endpoint uses
        this to decide whether to send email/Telegram fallback notifications.
        For correctness at scale, replace this with a Redis SET that tracks
        online users across all workers.
        """
        return bool(self.active.get(user_id))

    async def broadcast_to_users(self, user_ids: list[str], payload: dict) -> None:
        """Send payload to a list of users (local delivery + Redis publish each)."""
        for uid in user_ids:
            await self.send_to_user(uid, payload)

    # ------------------------------------------------------------------
    # Redis pub/sub listener management
    # ------------------------------------------------------------------

    async def _ensure_redis_listener(self, user_id: str) -> None:
        """Start a Redis pub/sub listener task for user_id if not already running."""
        if user_id in self._redis_listeners:
            task = self._redis_listeners[user_id]
            if not task.done():
                return  # already running
        try:
            client = await get_redis()
            if client is None:
                return  # Redis unavailable — local-only mode
            task = asyncio.create_task(
                self._redis_listener_task(user_id),
                name=f"ws-redis-listener-{user_id}",
            )
            self._redis_listeners[user_id] = task
        except Exception as exc:
            logger.warning(
                "Could not start Redis listener for user_id=%s: %s", user_id, exc
            )

    def _cancel_redis_listener(self, user_id: str) -> None:
        """Cancel and remove the Redis listener task for user_id."""
        task = self._redis_listeners.pop(user_id, None)
        if task and not task.done():
            task.cancel()

    async def _redis_listener_task(self, user_id: str) -> None:
        """Long-lived coroutine: subscribe to the Redis channel for user_id and
        forward any received messages to local WebSocket connections.

        This task exits when:
          - It is cancelled (user disconnected from this worker).
          - Redis raises a connection error (logged; reconnection is not attempted
            to avoid thundering-herd on Redis restart).
        """
        channel = f"{_USER_CHANNEL_PREFIX}{user_id}"
        try:
            client = await get_redis()
            if client is None:
                return
            # Each subscriber needs its own dedicated connection.
            pubsub = client.pubsub()
            await pubsub.subscribe(channel)
            logger.debug("Redis: subscribed to %s", channel)

            async for message in pubsub.listen():
                # pubsub.listen() yields control-flow messages too.
                if message["type"] != "message":
                    continue
                data = message["data"]
                if not data:
                    continue
                # Forward to local connections — they were the source of the
                # publish on another worker, so we should not re-publish.
                await self._send_local(user_id, data)

        except asyncio.CancelledError:
            logger.debug("Redis listener cancelled for user_id=%s", user_id)
        except Exception as exc:
            logger.warning(
                "Redis listener error for user_id=%s: %s — local-only mode active",
                user_id,
                exc,
            )
        finally:
            # Best-effort cleanup — ignore errors during teardown.
            try:
                await pubsub.unsubscribe(channel)
                await pubsub.close()
            except Exception:
                pass


# Shared singleton — import `manager` wherever you need to push events.
manager = ConnectionManager()
