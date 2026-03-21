"""WebSocket connection manager.

A single module-level `manager` instance is shared across all routers so
that any router can push a real-time payload to a connected user.
"""
import json
import logging
from collections import defaultdict
from typing import DefaultDict

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self) -> None:
        # user_id (str) -> list of active WebSocket connections
        self.active: DefaultDict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, websocket: WebSocket, user_id: str) -> None:
        await websocket.accept()
        self.active[user_id].append(websocket)
        logger.info("WS connected: user_id=%s total_connections=%d", user_id, len(self.active[user_id]))

    def disconnect(self, websocket: WebSocket, user_id: str) -> None:
        self.active[user_id] = [ws for ws in self.active[user_id] if ws is not websocket]
        if not self.active[user_id]:
            del self.active[user_id]
        logger.info("WS disconnected: user_id=%s", user_id)

    async def send_to_user(self, user_id: str, payload: dict) -> None:
        """Send a JSON payload to all active connections of a user.

        Stale / closed sockets are detected on send failure and removed.
        """
        dead: list[WebSocket] = []
        for ws in list(self.active.get(user_id, [])):
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, user_id)

    def is_online(self, user_id: str) -> bool:
        """Return True if the user has at least one active connection."""
        return bool(self.active.get(user_id))

    async def broadcast_to_users(self, user_ids: list[str], payload: dict) -> None:
        """Send a payload to a list of users in sequence."""
        for uid in user_ids:
            await self.send_to_user(uid, payload)


# Shared singleton — import `manager` wherever you need to push events.
manager = ConnectionManager()
