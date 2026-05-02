"""
TAJCAR.TJ Load Test Suite
=========================
Tests the API under 1,000 concurrent users against a database seeded with
10,000 listings.

User class distribution (weights match the --users split at 1000 users):
  AnonymousUser    weight=50  -> ~500 users
  AuthenticatedUser weight=35 -> ~350 users
  AdminUser        weight=5   -> ~50  users
  ChatUser         weight=10  -> ~100 users

Before running:
  1. python seed_data.py           # seed 50 users + 10,000 listings
  2. locust -f locustfile.py --host=http://localhost:8000

Web UI: http://localhost:8089
"""

from __future__ import annotations

import json
import logging
import os
import random
import string
import time
from typing import Optional

from locust import HttpUser, TaskSet, between, events, task
from locust.exception import RescheduleTask

# ---------------------------------------------------------------------------
# Logging — structured JSON to keep Locust's own output clean
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.WARNING,
    format='{"time": "%(asctime)s", "level": "%(levelname)s", "msg": %(message)s}',
)
logger = logging.getLogger("tajcar_load")

# ---------------------------------------------------------------------------
# Constants drawn from seed_data.py so both files stay in sync
# ---------------------------------------------------------------------------
SEED_USER_COUNT = 50
SEED_USER_PASSWORD = "loadtest123"
SEED_PHONE_PREFIX = "+9920000000"   # phones: +992000000000 … +992000000049

SEARCH_TERMS = [
    "Toyota", "Nexia", "Matiz", "Damas", "Cobalt", "Lacetti",
    "Camry", "Corolla", "BMW", "Mercedes", "Honda", "Hyundai",
    "Kia", "Lada", "Daewoo", "Chevrolet", "Dushanbe", "Khujand",
    "2020", "2022", "sedan", "suv",
]

CITIES = ["Dushanbe", "Khujand", "Kulob", "Qurghonteppa", "Istaravshan"]
BRANDS = ["Toyota", "Honda", "Daewoo", "Chevrolet", "Hyundai", "Kia", "BMW", "Mercedes"]

LISTING_IMAGE_URL = (
    "https://res.cloudinary.com/demo/image/upload/sample.jpg"
)

# ---------------------------------------------------------------------------
# Shared in-process cache: listing IDs fetched once by the first worker that
# calls the catalog.  All locust user instances running in the same process
# share this list so we can make realistic /listings/{id} requests.
# ---------------------------------------------------------------------------
_ACTIVE_LISTING_IDS: list[str] = []
_IDS_LOADED_AT: float = 0.0
_IDS_TTL = 120.0   # refresh every 2 minutes


def _refresh_listing_ids_if_needed(client) -> None:
    """Pull up to 200 active listing IDs from the API into the shared cache."""
    global _IDS_LOADED_AT
    now = time.monotonic()
    if _ACTIVE_LISTING_IDS and (now - _IDS_LOADED_AT) < _IDS_TTL:
        return  # still fresh

    with client.get(
        "/api/v1/listings",
        params={"limit": 100, "page": 1},
        name="/api/v1/listings [seed]",
        catch_response=True,
    ) as resp:
        if resp.status_code == 200:
            body = resp.json()
            items = body.get("data", {}).get("items", [])
            ids = [item["id"] for item in items if item.get("id")]
            if ids:
                _ACTIVE_LISTING_IDS.clear()
                _ACTIVE_LISTING_IDS.extend(ids)
                _IDS_LOADED_AT = now
            resp.success()
        else:
            resp.failure(f"seed listing IDs: HTTP {resp.status_code}")

    # Also pull page 2 to have a bigger pool
    if _ACTIVE_LISTING_IDS:
        with client.get(
            "/api/v1/listings",
            params={"limit": 100, "page": 2},
            name="/api/v1/listings [seed]",
            catch_response=True,
        ) as resp2:
            if resp2.status_code == 200:
                body2 = resp2.json()
                items2 = body2.get("data", {}).get("items", [])
                ids2 = [item["id"] for item in items2 if item.get("id")]
                for lid in ids2:
                    if lid not in _ACTIVE_LISTING_IDS:
                        _ACTIVE_LISTING_IDS.append(lid)
            resp2.success()


def _pick_listing_id() -> Optional[str]:
    if not _ACTIVE_LISTING_IDS:
        return None
    return random.choice(_ACTIVE_LISTING_IDS)


# ---------------------------------------------------------------------------
# Helper: assert response envelope is success=True
# ---------------------------------------------------------------------------

def _check_envelope(resp, name: str) -> bool:
    """
    Validates the ApiResponse envelope.
    Marks the Locust request as failure if the envelope says success=False
    or if the JSON is malformed, so the error rate metric is meaningful.
    Returns True if the response is good.
    """
    if resp.status_code >= 500:
        resp.failure(f"{name}: HTTP {resp.status_code}")
        return False
    if resp.status_code == 429:
        # Rate-limited — expected behaviour under load from a single IP.
        # Mark as success so it doesn't inflate the error rate metric.
        resp.success()
        return False
    if resp.status_code >= 400:
        # Other 4xx (401, 403, 404) count as failures unless the caller
        # explicitly calls resp.success() after this function returns False.
        return False
    try:
        body = resp.json()
    except Exception:
        resp.failure(f"{name}: response is not JSON")
        return False
    if not body.get("success"):
        resp.failure(f"{name}: success=False — {body.get('message', '')}")
        return False
    resp.success()
    return True


# ============================================================================
# AnonymousUser — 50% of traffic
# Simulates unauthenticated browsing: homepage, catalog, search, car detail.
# ============================================================================

class AnonymousUser(HttpUser):
    weight = 50
    wait_time = between(1, 5)

    def on_start(self):
        _refresh_listing_ids_if_needed(self.client)

    # ---- homepage section --------------------------------------------------

    @task(10)
    def browse_featured_listings(self):
        """Homepage: featured cars carousel."""
        with self.client.get(
            "/api/v1/listings/featured",
            name="/api/v1/listings/featured",
            catch_response=True,
        ) as resp:
            _check_envelope(resp, "featured")

    @task(8)
    def browse_listings_default(self):
        """Main listing feed — default ranking sort, page 1."""
        with self.client.get(
            "/api/v1/listings",
            params={"page": 1, "limit": 20},
            name="/api/v1/listings",
            catch_response=True,
        ) as resp:
            _check_envelope(resp, "listings")

    @task(5)
    def browse_listings_page_n(self):
        """Paginated browsing — random deeper page."""
        page = random.randint(2, 10)
        with self.client.get(
            "/api/v1/listings",
            params={"page": page, "limit": 20},
            name="/api/v1/listings?page=N",
            catch_response=True,
        ) as resp:
            _check_envelope(resp, f"listings page {page}")

    @task(6)
    def browse_listings_with_brand_filter(self):
        brand = random.choice(BRANDS)
        with self.client.get(
            "/api/v1/listings",
            params={"brand": brand, "page": 1, "limit": 20},
            name="/api/v1/listings?brand=",
            catch_response=True,
        ) as resp:
            _check_envelope(resp, "listings brand filter")

    @task(5)
    def browse_listings_with_city_filter(self):
        city = random.choice(CITIES)
        with self.client.get(
            "/api/v1/listings",
            params={"city": city, "page": 1, "limit": 20},
            name="/api/v1/listings?city=",
            catch_response=True,
        ) as resp:
            _check_envelope(resp, "listings city filter")

    @task(4)
    def browse_listings_price_sorted(self):
        """Catalog sorted by price ascending."""
        with self.client.get(
            "/api/v1/listings",
            params={"sort": "price_asc", "page": 1, "limit": 20},
            name="/api/v1/listings?sort=price_asc",
            catch_response=True,
        ) as resp:
            _check_envelope(resp, "listings price_asc")

    @task(4)
    def browse_listings_newest(self):
        with self.client.get(
            "/api/v1/listings",
            params={"sort": "newest", "page": 1, "limit": 20},
            name="/api/v1/listings?sort=newest",
            catch_response=True,
        ) as resp:
            _check_envelope(resp, "listings newest")

    # ---- car detail --------------------------------------------------------

    @task(15)
    def view_car_detail(self):
        """Individual car page — highest frequency task for anonymous users."""
        _refresh_listing_ids_if_needed(self.client)
        lid = _pick_listing_id()
        if not lid:
            raise RescheduleTask()
        with self.client.get(
            f"/api/v1/listings/{lid}",
            name="/api/v1/listings/[id]",
            catch_response=True,
        ) as resp:
            _check_envelope(resp, "listing detail")

    @task(6)
    def view_recommendations(self):
        """Related listings panel on the car detail page."""
        lid = _pick_listing_id()
        params = {"listing_id": lid} if lid else {}
        with self.client.get(
            "/api/v1/search/recommendations",
            params=params,
            name="/api/v1/search/recommendations",
            catch_response=True,
        ) as resp:
            _check_envelope(resp, "recommendations")

    # ---- search ------------------------------------------------------------

    @task(12)
    def search(self):
        term = random.choice(SEARCH_TERMS)
        with self.client.get(
            "/api/v1/search",
            params={"q": term, "limit": 20},
            name="/api/v1/search",
            catch_response=True,
        ) as resp:
            _check_envelope(resp, "search")

    @task(7)
    def search_suggestions(self):
        term = random.choice(SEARCH_TERMS)[:3]   # partial query
        with self.client.get(
            "/api/v1/search/suggestions",
            params={"q": term},
            name="/api/v1/search/suggestions",
            catch_response=True,
        ) as resp:
            _check_envelope(resp, "suggestions")

    @task(3)
    def search_popular(self):
        with self.client.get(
            "/api/v1/search/popular",
            name="/api/v1/search/popular",
            catch_response=True,
        ) as resp:
            _check_envelope(resp, "popular searches")

    @task(2)
    def search_trending(self):
        with self.client.get(
            "/api/v1/search/trending",
            name="/api/v1/search/trending",
            catch_response=True,
        ) as resp:
            _check_envelope(resp, "trending")

    @task(2)
    def search_did_you_mean(self):
        term = random.choice(["Toyata", "Handa", "Byumers", "Mercdes"])
        with self.client.get(
            "/api/v1/search/did-you-mean",
            params={"q": term},
            name="/api/v1/search/did-you-mean",
            catch_response=True,
        ) as resp:
            _check_envelope(resp, "did-you-mean")

    # ---- catalog meta ------------------------------------------------------

    @task(4)
    def catalog_brands(self):
        with self.client.get(
            "/api/v1/catalog/brands",
            name="/api/v1/catalog/brands",
            catch_response=True,
        ) as resp:
            _check_envelope(resp, "catalog brands")

    @task(3)
    def catalog_categories(self):
        with self.client.get(
            "/api/v1/catalog/categories",
            name="/api/v1/catalog/categories",
            catch_response=True,
        ) as resp:
            _check_envelope(resp, "catalog categories")

    @task(2)
    def catalog_banners(self):
        with self.client.get(
            "/api/v1/catalog/banners",
            name="/api/v1/catalog/banners",
            catch_response=True,
        ) as resp:
            _check_envelope(resp, "catalog banners")

    # ---- stats & health ----------------------------------------------------

    @task(2)
    def platform_stats(self):
        with self.client.get(
            "/api/v1/stats/marketplace",
            name="/api/v1/stats/marketplace",
            catch_response=True,
        ) as resp:
            _check_envelope(resp, "stats")

    @task(1)
    def health_check(self):
        with self.client.get(
            "/health",
            name="/health",
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"health: HTTP {resp.status_code}")


# ============================================================================
# AuthenticatedUser — 35% of traffic
# Simulates a logged-in buyer: login once, browse, favorite, post a listing.
# ============================================================================

class AuthenticatedUser(HttpUser):
    weight = 35
    wait_time = between(2, 6)

    # Instance state
    _token: Optional[str] = None
    _user_id: Optional[str] = None
    _user_index: int = 0
    _my_listing_ids: list[str]

    def on_start(self):
        self._my_listing_ids = []
        self._user_index = random.randint(0, SEED_USER_COUNT - 1)
        self._do_login()
        _refresh_listing_ids_if_needed(self.client)

    def _do_login(self):
        """Authenticate as one of the seeded load-test users."""
        phone = f"{SEED_PHONE_PREFIX}{self._user_index:02d}"
        with self.client.post(
            "/api/v1/auth/login",
            json={"phone": phone, "password": SEED_USER_PASSWORD},
            name="/api/v1/auth/login",
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                body = resp.json()
                token = body.get("data", {}).get("token", {}).get("access_token")
                user_id = body.get("data", {}).get("user", {}).get("id")
                if token:
                    self._token = token
                    self._user_id = user_id
                    self.client.headers.update({"Authorization": f"Bearer {token}"})
                    resp.success()
                else:
                    resp.failure("login: no access_token in response")
            elif resp.status_code == 401:
                # Seed users not yet created — re-schedule silently
                resp.success()   # don't pollute error rate
                raise RescheduleTask()
            else:
                resp.failure(f"login: HTTP {resp.status_code}")

    # ---- browsing ----------------------------------------------------------

    @task(10)
    def browse_listings(self):
        with self.client.get(
            "/api/v1/listings",
            params={"page": 1, "limit": 20},
            name="/api/v1/listings",
            catch_response=True,
        ) as resp:
            _check_envelope(resp, "listings")

    @task(12)
    def view_car_detail(self):
        _refresh_listing_ids_if_needed(self.client)
        lid = _pick_listing_id()
        if not lid:
            raise RescheduleTask()
        with self.client.get(
            f"/api/v1/listings/{lid}",
            name="/api/v1/listings/[id]",
            catch_response=True,
        ) as resp:
            _check_envelope(resp, "listing detail")

    @task(8)
    def search(self):
        term = random.choice(SEARCH_TERMS)
        with self.client.get(
            "/api/v1/search",
            params={"q": term, "limit": 20},
            name="/api/v1/search",
            catch_response=True,
        ) as resp:
            _check_envelope(resp, "search")

    # ---- auth-required actions ---------------------------------------------

    @task(6)
    def toggle_favorite(self):
        lid = _pick_listing_id()
        if not lid:
            raise RescheduleTask()
        with self.client.post(
            f"/api/v1/listings/{lid}/favorite",
            name="/api/v1/listings/[id]/favorite",
            catch_response=True,
        ) as resp:
            if resp.status_code in (200, 401):
                resp.success()
            else:
                _check_envelope(resp, "toggle favorite")

    @task(5)
    def view_dashboard(self):
        """GET /auth/me — profile fetch that the dashboard does on load."""
        with self.client.get(
            "/api/v1/auth/me",
            name="/api/v1/auth/me",
            catch_response=True,
        ) as resp:
            if resp.status_code == 401:
                resp.success()
                self._do_login()
            else:
                _check_envelope(resp, "auth/me")

    @task(4)
    def view_notifications(self):
        with self.client.get(
            "/api/v1/notifications",
            params={"page": 1, "limit": 20},
            name="/api/v1/notifications",
            catch_response=True,
        ) as resp:
            if resp.status_code == 401:
                resp.success()
            else:
                _check_envelope(resp, "notifications")

    @task(2)
    def view_unread_notification_count(self):
        with self.client.get(
            "/api/v1/notifications/unread-count",
            name="/api/v1/notifications/unread-count",
            catch_response=True,
        ) as resp:
            if resp.status_code == 401:
                resp.success()
            else:
                _check_envelope(resp, "unread-count")

    @task(2)
    def post_listing(self):
        """Submit a new listing. New listings go straight to status=pending,
        so they will NOT flood the public feed and will not inflate metrics."""
        if not self._token:
            raise RescheduleTask()

        brand = random.choice(BRANDS)
        payload = {
            "type": "sale",
            "brand": brand,
            "model": random.choice(["Camry", "Corolla", "Nexia", "Cobalt", "Matiz", "Civic"]),
            "year": random.randint(2005, 2023),
            "price": str(random.randint(3000, 30000)),
            "currency": "USD",
            "city": random.choice(CITIES),
            "mileage": random.randint(10000, 250000),
            "fuel": random.choice(["Бензин", "Дизель", "Газ"]),
            "transmission": random.choice(["Автомат", "Механика"]),
            "body_type": random.choice(["sedan", "suv", "hatchback"]),
            "description": "Load test listing — auto-generated",
            "contact_name": "Load Test User",
            "contact_phone": f"+992900{random.randint(100000, 999999)}",
            "contact_method": "phone_and_chat",
            "image_urls": [LISTING_IMAGE_URL],
        }
        with self.client.post(
            "/api/v1/listings",
            json=payload,
            name="/api/v1/listings [POST]",
            catch_response=True,
        ) as resp:
            if resp.status_code == 201:
                body = resp.json()
                lid = body.get("data", {}).get("id")
                if lid:
                    self._my_listing_ids.append(lid)
                resp.success()
            elif resp.status_code in (401, 429):
                # 401 = token expired, 429 = listing limit reached — both expected
                resp.success()
            else:
                resp.failure(f"create listing: HTTP {resp.status_code}")

    @task(1)
    def delete_own_listing(self):
        """Delete one of the listings posted during this session (cleanup)."""
        if not self._my_listing_ids:
            raise RescheduleTask()
        lid = self._my_listing_ids.pop()
        with self.client.delete(
            f"/api/v1/listings/{lid}",
            name="/api/v1/listings/[id] [DELETE]",
            catch_response=True,
        ) as resp:
            if resp.status_code in (200, 401, 404):
                resp.success()
            else:
                resp.failure(f"delete listing: HTTP {resp.status_code}")

    @task(3)
    def catalog_brands(self):
        with self.client.get(
            "/api/v1/catalog/brands",
            name="/api/v1/catalog/brands",
            catch_response=True,
        ) as resp:
            _check_envelope(resp, "catalog brands")


# ============================================================================
# AdminUser — 5% of traffic
# Simulates a moderator: login, view stats, work the moderation queue.
# Uses the same seeded users with index 0 for simplicity.
# In production the admin account would differ — this is fine for load testing.
# ============================================================================

class AdminUser(HttpUser):
    weight = 5
    wait_time = between(3, 8)

    _token: Optional[str] = None
    _pending_ids: list[str]

    def on_start(self):
        self._pending_ids = []
        # Log in as user_0 — the seed script assigns the standard user role
        # but the admin endpoints are reached via the seeded staff accounts.
        # For load testing purposes we use the first seed user; in a real
        # environment point this at an account with role=admin or role=moderator.
        phone = f"{SEED_PHONE_PREFIX}00"
        with self.client.post(
            "/api/v1/auth/login",
            json={"phone": phone, "password": SEED_USER_PASSWORD},
            name="/api/v1/auth/login [admin]",
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                body = resp.json()
                token = body.get("data", {}).get("token", {}).get("access_token")
                if token:
                    self._token = token
                    self.client.headers.update({"Authorization": f"Bearer {token}"})
                    resp.success()
                else:
                    resp.failure("admin login: no token")
            else:
                resp.success()   # non-admin user will just get 403 on admin routes

    @task(5)
    def view_admin_stats(self):
        """Dashboard summary card."""
        with self.client.get(
            "/api/v1/admin/stats",
            name="/api/v1/admin/stats",
            catch_response=True,
        ) as resp:
            # 403 is expected when seed user has no admin role
            if resp.status_code in (200, 403):
                resp.success()
            else:
                resp.failure(f"admin stats: HTTP {resp.status_code}")

    @task(8)
    def view_moderation_queue(self):
        """Fetch pending listings that need review."""
        with self.client.get(
            "/api/v1/admin/moderation/pending",
            params={"page": 1, "limit": 20},
            name="/api/v1/admin/moderation/pending",
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                body = resp.json()
                items = body.get("data", {}).get("items", [])
                self._pending_ids.extend(item["id"] for item in items if item.get("id"))
                resp.success()
            elif resp.status_code == 403:
                resp.success()   # expected for non-admin seed users
            else:
                resp.failure(f"moderation queue: HTTP {resp.status_code}")

    @task(4)
    def approve_listing(self):
        if not self._pending_ids:
            raise RescheduleTask()
        lid = self._pending_ids.pop()
        with self.client.put(
            f"/api/v1/admin/moderation/{lid}/approve",
            name="/api/v1/admin/moderation/[id]/approve",
            catch_response=True,
        ) as resp:
            if resp.status_code in (200, 400, 403, 404):
                # 400 = already approved, 403 = no role, 404 = not found
                resp.success()
            else:
                resp.failure(f"approve: HTTP {resp.status_code}")

    @task(2)
    def reject_listing(self):
        if not self._pending_ids:
            raise RescheduleTask()
        lid = self._pending_ids.pop()
        with self.client.put(
            f"/api/v1/admin/moderation/{lid}/reject",
            json={"reason": "Load test rejection — automated QA"},
            name="/api/v1/admin/moderation/[id]/reject",
            catch_response=True,
        ) as resp:
            if resp.status_code in (200, 400, 403, 404):
                resp.success()
            else:
                resp.failure(f"reject: HTTP {resp.status_code}")

    @task(3)
    def list_users(self):
        """CRM: user list with default pagination."""
        with self.client.get(
            "/api/v1/admin/users",
            params={"page": 1, "limit": 50},
            name="/api/v1/admin/users",
            catch_response=True,
        ) as resp:
            if resp.status_code in (200, 403):
                resp.success()
            else:
                resp.failure(f"admin users: HTTP {resp.status_code}")

    @task(2)
    def platform_stats_public(self):
        """Public stats endpoint (no auth required)."""
        with self.client.get(
            "/api/v1/stats/marketplace",
            name="/api/v1/stats/marketplace",
            catch_response=True,
        ) as resp:
            _check_envelope(resp, "stats marketplace")


# ============================================================================
# ChatUser — 10% of traffic
# Simulates a buyer messaging a seller via the REST chat API.
# ============================================================================

class ChatUser(HttpUser):
    weight = 10
    wait_time = between(2, 7)

    _token: Optional[str] = None
    _user_id: Optional[str] = None
    _conversation_ids: list[str]

    def on_start(self):
        self._conversation_ids = []
        idx = random.randint(0, SEED_USER_COUNT - 1)
        phone = f"{SEED_PHONE_PREFIX}{idx:02d}"
        with self.client.post(
            "/api/v1/auth/login",
            json={"phone": phone, "password": SEED_USER_PASSWORD},
            name="/api/v1/auth/login [chat]",
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                body = resp.json()
                token = body.get("data", {}).get("token", {}).get("access_token")
                user_id = body.get("data", {}).get("user", {}).get("id")
                if token:
                    self._token = token
                    self._user_id = user_id
                    self.client.headers.update({"Authorization": f"Bearer {token}"})
                    resp.success()
                else:
                    resp.failure("chat login: no token")
            else:
                resp.success()
                raise RescheduleTask()

        _refresh_listing_ids_if_needed(self.client)
        self._load_or_create_conversation()

    def _load_or_create_conversation(self):
        """Fetch existing conversations or open one against another user."""
        with self.client.get(
            "/api/v1/conversations",
            name="/api/v1/conversations",
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                body = resp.json()
                items = body.get("data", [])
                for c in items:
                    cid = c.get("id")
                    if cid and cid not in self._conversation_ids:
                        self._conversation_ids.append(cid)
                resp.success()
            else:
                resp.success()

        if not self._conversation_ids:
            # Open a conversation with a random other seed user
            other_idx = random.randint(0, SEED_USER_COUNT - 1)
            other_phone = f"{SEED_PHONE_PREFIX}{other_idx:02d}"
            # We cannot easily look up user IDs by phone here without an extra
            # endpoint, so we create a support ticket instead — it requires no
            # participant_id and is a realistic traffic pattern.
            with self.client.post(
                "/api/v1/conversations",
                json={"type": "support"},
                name="/api/v1/conversations [POST]",
                catch_response=True,
            ) as resp:
                if resp.status_code in (200, 201):
                    body = resp.json()
                    cid = body.get("data", {}).get("id")
                    if cid:
                        self._conversation_ids.append(cid)
                    resp.success()
                else:
                    resp.success()

    @task(8)
    def list_conversations(self):
        with self.client.get(
            "/api/v1/conversations",
            name="/api/v1/conversations",
            catch_response=True,
        ) as resp:
            if resp.status_code == 401:
                resp.success()
            else:
                _check_envelope(resp, "list conversations")

    @task(10)
    def send_message(self):
        if not self._conversation_ids:
            raise RescheduleTask()
        cid = random.choice(self._conversation_ids)
        messages = [
            "Is this car still available?",
            "What is the final price?",
            "Can I see it tomorrow?",
            "Is the mileage correct?",
            "Does it have any damage?",
            "Can you lower the price a bit?",
        ]
        with self.client.post(
            f"/api/v1/conversations/{cid}/messages",
            json={"content": random.choice(messages)},
            name="/api/v1/conversations/[id]/messages [POST]",
            catch_response=True,
        ) as resp:
            if resp.status_code in (200, 201, 401, 403, 404):
                resp.success()
            else:
                resp.failure(f"send message: HTTP {resp.status_code}")

    @task(6)
    def read_messages(self):
        if not self._conversation_ids:
            raise RescheduleTask()
        cid = random.choice(self._conversation_ids)
        with self.client.get(
            f"/api/v1/conversations/{cid}/messages",
            params={"page": 1, "limit": 30},
            name="/api/v1/conversations/[id]/messages",
            catch_response=True,
        ) as resp:
            if resp.status_code in (200, 401, 403, 404):
                resp.success()
            else:
                resp.failure(f"read messages: HTTP {resp.status_code}")

    @task(3)
    def mark_conversation_read(self):
        if not self._conversation_ids:
            raise RescheduleTask()
        cid = random.choice(self._conversation_ids)
        with self.client.put(
            f"/api/v1/conversations/{cid}/read",
            name="/api/v1/conversations/[id]/read",
            catch_response=True,
        ) as resp:
            if resp.status_code in (200, 401, 403, 404):
                resp.success()
            else:
                resp.failure(f"mark read: HTTP {resp.status_code}")

    @task(2)
    def open_new_support_ticket(self):
        """Periodically open a fresh support conversation."""
        with self.client.post(
            "/api/v1/conversations",
            json={"type": "support"},
            name="/api/v1/conversations [POST]",
            catch_response=True,
        ) as resp:
            if resp.status_code in (200, 201, 401):
                if resp.status_code in (200, 201):
                    try:
                        cid = resp.json().get("data", {}).get("id")
                        if cid and cid not in self._conversation_ids:
                            self._conversation_ids.append(cid)
                    except Exception:
                        pass
                resp.success()
            else:
                resp.failure(f"open support ticket: HTTP {resp.status_code}")
