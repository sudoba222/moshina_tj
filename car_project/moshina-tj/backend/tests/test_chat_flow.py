"""Integration test: end-to-end chat flow.

Requires a running backend at BASE_URL and a reachable database.

Run:
    BASE_URL=http://localhost:8000 python -m pytest tests/test_chat_flow.py -v

The test relies on phone OTP auth.  In dev mode the OTP is printed to the
server stdout; set TEST_OTP_OVERRIDE to bypass real OTP delivery (dev only).
"""
import os
import uuid

import pytest
import requests

BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")
API = f"{BASE_URL}/api/v1"

# In dev mode the server logs the OTP — set this env var to the fixed OTP
# your test seeds produce, or patch the OTP table directly.
TEST_OTP_OVERRIDE = os.getenv("TEST_OTP_OVERRIDE", "123456")

PHONE_A = f"+99200{uuid.uuid4().int % 10_000_000:07d}"
PHONE_B = f"+99200{uuid.uuid4().int % 10_000_000:07d}"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _register_user(phone: str) -> str:
    """Register via OTP flow, return JWT token."""
    # Step 1: request OTP
    r = requests.post(f"{API}/auth/send-otp", json={"phone": phone})
    assert r.status_code == 200, f"send-otp failed: {r.text}"

    # Step 2: verify OTP — in dev mode TEST_OTP_OVERRIDE is logged by server
    r = requests.post(
        f"{API}/auth/verify-otp",
        json={"phone": phone, "code": TEST_OTP_OVERRIDE},
    )
    assert r.status_code == 200, f"verify-otp failed: {r.text}"
    data = r.json()
    assert data["success"] is True, f"verify-otp not successful: {data}"
    return data["data"]["token"]["access_token"]


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def user_a_token():
    return _register_user(PHONE_A)


@pytest.fixture(scope="module")
def user_b_token():
    return _register_user(PHONE_B)


@pytest.fixture(scope="module")
def user_b_id(user_b_token):
    r = requests.get(f"{API}/auth/me", headers=_headers(user_b_token))
    assert r.status_code == 200
    return r.json()["data"]["id"]


@pytest.fixture(scope="module")
def conversation_id(user_a_token, user_b_id):
    r = requests.post(
        f"{API}/conversations",
        json={"participant_id": user_b_id},
        headers=_headers(user_a_token),
    )
    assert r.status_code == 200, f"create conversation failed: {r.text}"
    data = r.json()
    assert data["success"] is True
    return data["data"]["id"]


def test_create_conversation(conversation_id):
    """Conversation is created successfully and returns a UUID."""
    assert conversation_id is not None
    # Validate it looks like a UUID
    uuid.UUID(conversation_id)


def test_send_message(user_a_token, conversation_id):
    """User A sends a message and receives it back in the response."""
    r = requests.post(
        f"{API}/conversations/{conversation_id}/messages",
        json={"content": "Hello from user A"},
        headers=_headers(user_a_token),
    )
    assert r.status_code == 201, f"send message failed: {r.text}"
    data = r.json()
    assert data["success"] is True
    assert data["data"]["content"] == "Hello from user A"
    assert data["data"]["conversation_id"] == conversation_id


def test_fetch_message_history(user_a_token, conversation_id):
    """Message history contains the message that was sent."""
    r = requests.get(
        f"{API}/conversations/{conversation_id}/messages",
        headers=_headers(user_a_token),
    )
    assert r.status_code == 200, f"fetch messages failed: {r.text}"
    data = r.json()
    assert data["success"] is True
    page = data["data"]
    assert page["total"] >= 1
    contents = [m["content"] for m in page["items"]]
    assert "Hello from user A" in contents


def test_mark_conversation_read(user_b_token, conversation_id):
    """User B marks the conversation as read."""
    r = requests.put(
        f"{API}/conversations/{conversation_id}/read",
        headers=_headers(user_b_token),
    )
    assert r.status_code == 200, f"mark read failed: {r.text}"
    assert r.json()["success"] is True


def test_list_conversations_shows_conversation(user_a_token, conversation_id):
    """User A's conversation list includes the conversation we created."""
    r = requests.get(f"{API}/conversations", headers=_headers(user_a_token))
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    ids = [c["id"] for c in data["data"]]
    assert conversation_id in ids


def test_notifications_endpoint(user_b_token):
    """Notifications endpoint is accessible and returns pagination shape."""
    r = requests.get(f"{API}/notifications", headers=_headers(user_b_token))
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    page = data["data"]
    assert "items" in page
    assert "total" in page
    assert "page" in page
    assert "pages" in page


def test_unread_count(user_b_token):
    """Unread count endpoint returns a non-negative integer."""
    r = requests.get(f"{API}/notifications/unread-count", headers=_headers(user_b_token))
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert data["data"]["count"] >= 0
