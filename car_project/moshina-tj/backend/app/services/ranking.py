"""Listing ranking score computation.

Shared between listings.py (creation) and admin.py (approval/activation).
"""
from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models import Listing


def compute_ranking_score(listing: "Listing") -> float:
    """Compute a ranking score for a listing. Higher = shown first.

    Factors (Avito/Encar style):
    - Quality:    photos, description, VIN verified
    - Freshness:  exponential decay over time
    - Engagement: views + favorites
    - Boost:      featured listings get a large flat bonus
    """
    now = datetime.now(timezone.utc)

    # ------------------------------------------------------------------
    # Quality score (0–30)
    # ------------------------------------------------------------------
    num_photos = len(listing.images) if listing.images else 0
    quality = min(num_photos * 3, 15)                          # up to 15pts for photos
    if listing.description and len(listing.description) > 50:
        quality += 5                                           # +5 for real description
    if listing.mileage:
        quality += 2
    if listing.fuel:
        quality += 2
    if listing.transmission:
        quality += 2
    if getattr(listing, "vin_verified", False):
        quality += 4                                           # +4 for VIN verified

    # ------------------------------------------------------------------
    # Freshness score (0–20): full score if <1 day, half-life ~30 days
    # ------------------------------------------------------------------
    created_at = listing.created_at
    if created_at is not None:
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        days_old = max(0.0, (now - created_at).total_seconds() / 86400)
        freshness = max(0.0, 20.0 * math.exp(-days_old / 30))
    else:
        freshness = 0.0

    # ------------------------------------------------------------------
    # Engagement score (0–30)
    # ------------------------------------------------------------------
    views = listing.views or 0
    favorites = getattr(listing, "favorites_count", 0) or 0
    engagement = min(views * 0.05, 15.0) + min(favorites * 1.0, 15.0)

    # ------------------------------------------------------------------
    # Featured boost (flat +50, only while the boost period is active)
    # ------------------------------------------------------------------
    featured_bonus = 0.0
    if getattr(listing, "is_featured", False):
        featured_until = getattr(listing, "featured_until", None)
        if featured_until is None or featured_until > now:
            featured_bonus = 50.0

    return round(quality + freshness + engagement + featured_bonus, 2)
