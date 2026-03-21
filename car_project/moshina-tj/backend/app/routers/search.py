"""
Search router — provides these endpoints:

    GET  /search                  Multi-strategy full-text + fuzzy search
    GET  /search/suggestions      Structured autocomplete (brand/model/city)
    GET  /search/did-you-mean     Spelling correction for a query
    GET  /search/recommendations  Multi-signal scored similar listings
    GET  /search/popular          Top searched queries (past 30 days)
    GET  /search/trending         Top brands & cities by new listings (7 days)
    POST /search/log              Client-side search event logging

PostgreSQL extensions required (handled by migration c3d4e5f6a7b8):
    pg_trgm        — similarity(), word_similarity(), trigram indexes
    fuzzystrmatch  — levenshtein()
"""

import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Body, Depends, Query, Request
from app.limiter import limiter
from sqlalchemy import Float, Integer, String, cast, desc, func, literal, or_, text, union
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Listing, ListingStatus, SearchLog
from app.schemas import ApiResponse, ListingResponse, SuggestionItem

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/search", tags=["search"])

# ---------------------------------------------------------------------------
# Module-level cache for /popular
# ---------------------------------------------------------------------------
_popular_cache: Dict[str, Any] = {}   # keys: "ts" (float), "data" (list[str])
_POPULAR_CACHE_TTL = 600              # 10 minutes in seconds

# ---------------------------------------------------------------------------
# Thresholds
# ---------------------------------------------------------------------------
_TRGM_SIMILARITY_THRESHOLD = 0.2
_SUGGESTION_THRESHOLD = 0.3
_DYM_SIMILARITY_GOOD_ENOUGH = 0.8
_DYM_SIMILARITY_MIN = 0.3
_DYM_EDIT_RATIO_MAX = 0.5


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _active_base(db: Session):
    """Return a base query restricted to active listings."""
    return db.query(Listing).filter(Listing.status == ListingStatus.active)


def _log_search(db: Session, query: str, results_count: int, user_id=None) -> None:
    """
    Insert a SearchLog row. Wrapped in try/except so that any logging
    failure never breaks the search response.
    """
    try:
        entry = SearchLog(
            query=query,
            results_count=results_count,
            user_id=user_id,
        )
        db.add(entry)
        db.commit()
    except Exception:
        logger.exception("Failed to write SearchLog for query=%r", query)
        db.rollback()


# ---------------------------------------------------------------------------
# GET /search
# ---------------------------------------------------------------------------

@router.get("", response_model=ApiResponse[list[ListingResponse]])
def search_listings(
    q: str = Query(..., min_length=1, description="Search term — brand, model, or city"),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Multi-strategy search with automatic fallback:

    1. tsvector full-text search  — fast, language-aware, ordered by ts_rank
    2. pg_trgm trigram similarity  — typo-tolerant, similarity > 0.2
    3. ILIKE                       — last-resort substring match

    Includes description and year in the tsvector for broader matching.
    Exact brand/model matches are boosted to the top of results.
    Logs every search for analytics.
    Only active listings are returned. Images are eager-loaded via joinedload.
    """
    q = q.strip()
    q_lower = q.lower()

    # ------------------------------------------------------------------
    # Strategy 1: tsvector full-text search
    # Includes brand, model, city, description, and year (cast to text).
    # ------------------------------------------------------------------
    search_vector = func.to_tsvector(
        "simple",
        func.coalesce(Listing.brand, "")
        + " "
        + func.coalesce(Listing.model, "")
        + " "
        + func.coalesce(Listing.city, "")
        + " "
        + func.coalesce(Listing.description, "")
        + " "
        + cast(Listing.year, String),
    )
    ts_query = func.plainto_tsquery("simple", q)
    ts_rank_expr = func.ts_rank(search_vector, ts_query)

    # Exact brand/model match gets a boost multiplier applied in Python below
    listings = (
        _active_base(db)
        .options(joinedload(Listing.images))
        .filter(search_vector.op("@@")(ts_query))
        .order_by(ts_rank_expr.desc(), Listing.views.desc())
        .limit(limit)
        .all()
    )

    if listings:
        # Boost exact brand/model matches to the front
        listings = _boost_exact(listings, q_lower)
        _log_search(db, q, len(listings))
        return ApiResponse(
            success=True,
            data=[ListingResponse.model_validate(l) for l in listings],
            message=f"{len(listings)} result(s) found",
        )

    # ------------------------------------------------------------------
    # Strategy 2: trigram similarity (pg_trgm)
    # ------------------------------------------------------------------
    brand_sim = func.similarity(Listing.brand, q)
    model_sim = func.similarity(Listing.model, q)
    city_sim  = func.similarity(Listing.city,  q)
    best_sim  = func.greatest(brand_sim, model_sim, city_sim)

    listings = (
        _active_base(db)
        .options(joinedload(Listing.images))
        .filter(
            or_(
                brand_sim > _TRGM_SIMILARITY_THRESHOLD,
                model_sim > _TRGM_SIMILARITY_THRESHOLD,
                city_sim  > _TRGM_SIMILARITY_THRESHOLD,
            )
        )
        .order_by(best_sim.desc(), Listing.views.desc())
        .limit(limit)
        .all()
    )

    if listings:
        listings = _boost_exact(listings, q_lower)
        _log_search(db, q, len(listings))
        return ApiResponse(
            success=True,
            data=[ListingResponse.model_validate(l) for l in listings],
            message=f"{len(listings)} result(s) found",
        )

    # ------------------------------------------------------------------
    # Strategy 3: ILIKE substring match
    # ------------------------------------------------------------------
    pattern = f"%{q}%"
    listings = (
        _active_base(db)
        .options(joinedload(Listing.images))
        .filter(
            or_(
                Listing.brand.ilike(pattern),
                Listing.model.ilike(pattern),
                Listing.city.ilike(pattern),
                Listing.description.ilike(pattern),
            )
        )
        .order_by(Listing.views.desc())
        .limit(limit)
        .all()
    )

    _log_search(db, q, len(listings))
    return ApiResponse(
        success=True,
        data=[ListingResponse.model_validate(l) for l in listings],
        message=f"{len(listings)} result(s) found",
    )


def _boost_exact(listings: list, q_lower: str) -> list:
    """
    Stable-sort: listings whose brand or model exactly matches the query
    (case-insensitive) are moved to the front. Order within each group is
    preserved (Python sort is stable).
    """
    return sorted(
        listings,
        key=lambda l: 0 if (l.brand.lower() == q_lower or l.model.lower() == q_lower) else 1,
    )


# ---------------------------------------------------------------------------
# GET /search/suggestions
# ---------------------------------------------------------------------------

@router.get("/suggestions", response_model=ApiResponse[list[SuggestionItem]])
def search_suggestions(
    q: str = Query(..., min_length=1, description="Partial search term for autocomplete"),
    db: Session = Depends(get_db),
):
    """
    Returns up to 12 structured autocomplete suggestions drawn from brand,
    model, and city columns of active listings.

    Each suggestion carries:
      - term: the suggestion text
      - type: "brand", "model", or "city"
      - count: number of active listings for that term

    Caps: 4 brands + 4 models + 4 cities maximum. Sorted by match score desc
    then count desc within each type.
    """
    q = q.strip()
    prefix_pattern = f"{q}%"
    CAP = 4

    brand_ws = func.word_similarity(q, Listing.brand)
    model_ws = func.word_similarity(q, Listing.model)
    city_ws  = func.word_similarity(q, Listing.city)

    # ---- Brand candidates (trigram + prefix) ----
    brand_trgm = (
        db.query(Listing.brand.label("term"), brand_ws.label("score"))
        .filter(Listing.status == ListingStatus.active, brand_ws > _SUGGESTION_THRESHOLD)
        .distinct()
    )
    brand_prefix = (
        db.query(Listing.brand.label("term"), literal(1.0).label("score"))
        .filter(Listing.status == ListingStatus.active, Listing.brand.ilike(prefix_pattern))
        .distinct()
    )
    brand_combined = union(brand_trgm, brand_prefix).subquery()
    brand_rows = (
        db.query(
            brand_combined.c.term,
            func.max(cast(brand_combined.c.score, Float)).label("best_score"),
        )
        .group_by(brand_combined.c.term)
        .order_by(
            func.max(cast(brand_combined.c.score, Float)).desc(),
        )
        .limit(CAP)
        .all()
    )

    # ---- Model candidates (trigram + prefix) ----
    model_trgm = (
        db.query(Listing.model.label("term"), model_ws.label("score"))
        .filter(Listing.status == ListingStatus.active, model_ws > _SUGGESTION_THRESHOLD)
        .distinct()
    )
    model_prefix = (
        db.query(Listing.model.label("term"), literal(1.0).label("score"))
        .filter(Listing.status == ListingStatus.active, Listing.model.ilike(prefix_pattern))
        .distinct()
    )
    model_combined = union(model_trgm, model_prefix).subquery()
    model_rows = (
        db.query(
            model_combined.c.term,
            func.max(cast(model_combined.c.score, Float)).label("best_score"),
        )
        .group_by(model_combined.c.term)
        .order_by(
            func.max(cast(model_combined.c.score, Float)).desc(),
        )
        .limit(CAP)
        .all()
    )

    # ---- City candidates (trigram + prefix) ----
    city_trgm = (
        db.query(Listing.city.label("term"), city_ws.label("score"))
        .filter(Listing.status == ListingStatus.active, city_ws > _SUGGESTION_THRESHOLD)
        .distinct()
    )
    city_prefix = (
        db.query(Listing.city.label("term"), literal(1.0).label("score"))
        .filter(Listing.status == ListingStatus.active, Listing.city.ilike(prefix_pattern))
        .distinct()
    )
    city_combined = union(city_trgm, city_prefix).subquery()
    city_rows = (
        db.query(
            city_combined.c.term,
            func.max(cast(city_combined.c.score, Float)).label("best_score"),
        )
        .group_by(city_combined.c.term)
        .order_by(
            func.max(cast(city_combined.c.score, Float)).desc(),
        )
        .limit(CAP)
        .all()
    )

    # ---- Build result with counts ----
    suggestions: list[SuggestionItem] = []
    seen: set[tuple[str, str]] = set()

    def _count_listings(field, value: str) -> int:
        return (
            db.query(func.count(Listing.id))
            .filter(Listing.status == ListingStatus.active, field == value)
            .scalar()
            or 0
        )

    for row in brand_rows:
        if not row.term:
            continue
        key = (row.term.lower(), "brand")
        if key not in seen:
            seen.add(key)
            suggestions.append(
                SuggestionItem(
                    term=row.term,
                    type="brand",
                    count=_count_listings(Listing.brand, row.term),
                )
            )

    for row in model_rows:
        if not row.term:
            continue
        key = (row.term.lower(), "model")
        if key not in seen:
            seen.add(key)
            suggestions.append(
                SuggestionItem(
                    term=row.term,
                    type="model",
                    count=_count_listings(Listing.model, row.term),
                )
            )

    for row in city_rows:
        if not row.term:
            continue
        key = (row.term.lower(), "city")
        if key not in seen:
            seen.add(key)
            suggestions.append(
                SuggestionItem(
                    term=row.term,
                    type="city",
                    count=_count_listings(Listing.city, row.term),
                )
            )

    return ApiResponse(
        success=True,
        data=suggestions,
        message=f"{len(suggestions)} suggestion(s) returned",
    )


# ---------------------------------------------------------------------------
# GET /search/did-you-mean
# ---------------------------------------------------------------------------

@router.get("/did-you-mean", response_model=ApiResponse[Optional[str]])
def did_you_mean(
    q: str = Query(..., min_length=1, description="Query to find a spelling correction for"),
    db: Session = Depends(get_db),
):
    """
    Returns the closest brand or model name from active listings when the
    query contains a probable typo.

    A correction is returned only when ALL of the following hold:
      - Levenshtein edit distance <= len(q) * 0.5  (within half the query length)
      - pg_trgm similarity > 0.3                   (meaningfully close)

    If the best candidate already has similarity > 0.8 the query is considered
    accurate and None is returned so the UI does not show an unnecessary banner.
    """
    q = q.strip()
    q_lower = q.lower()
    max_edit_distance = max(1, int(len(q) * _DYM_EDIT_RATIO_MAX))

    brand_edit = func.levenshtein(func.lower(Listing.brand), q_lower)
    model_edit = func.levenshtein(func.lower(Listing.model), q_lower)
    brand_sim  = func.similarity(Listing.brand, q)
    model_sim  = func.similarity(Listing.model, q)

    brand_rows = (
        db.query(
            Listing.brand.label("term"),
            brand_sim.label("sim"),
            brand_edit.label("edit_dist"),
        )
        .filter(
            Listing.status == ListingStatus.active,
            brand_edit <= max_edit_distance,
            brand_sim > _DYM_SIMILARITY_MIN,
        )
        .order_by(brand_sim.desc(), brand_edit.asc())
        .limit(1)
        .all()
    )

    model_rows = (
        db.query(
            Listing.model.label("term"),
            model_sim.label("sim"),
            model_edit.label("edit_dist"),
        )
        .filter(
            Listing.status == ListingStatus.active,
            model_edit <= max_edit_distance,
            model_sim > _DYM_SIMILARITY_MIN,
        )
        .order_by(model_sim.desc(), model_edit.asc())
        .limit(1)
        .all()
    )

    candidates = brand_rows + model_rows
    if not candidates:
        return ApiResponse(success=True, data=None, message="No correction found")

    best = max(candidates, key=lambda r: r.sim)

    if best.sim >= _DYM_SIMILARITY_GOOD_ENOUGH:
        return ApiResponse(success=True, data=None, message="Query already matches well")

    return ApiResponse(
        success=True,
        data=best.term,
        message="Did you mean this?",
    )


# ---------------------------------------------------------------------------
# GET /search/popular
# ---------------------------------------------------------------------------

@router.get("/popular", response_model=ApiResponse[list[str]])
def popular_searches(db: Session = Depends(get_db)):
    """
    Returns top 10 most searched queries from the past 30 days by frequency.

    Falls back to top brands by listing count if SearchLog has fewer than 5
    entries. Result is cached in memory for 10 minutes.
    """
    now = time.monotonic()
    if _popular_cache.get("ts") and (now - _popular_cache["ts"]) < _POPULAR_CACHE_TTL:
        return ApiResponse(
            success=True,
            data=_popular_cache["data"],
            message="Popular searches fetched",
        )

    cutoff = datetime.now(timezone.utc) - timedelta(days=30)

    log_count = (
        db.query(func.count(SearchLog.id))
        .filter(SearchLog.created_at >= cutoff)
        .scalar()
        or 0
    )

    if log_count >= 5:
        rows = (
            db.query(SearchLog.query, func.count(SearchLog.id).label("freq"))
            .filter(SearchLog.created_at >= cutoff)
            .group_by(SearchLog.query)
            .order_by(desc("freq"))
            .limit(10)
            .all()
        )
        result = [row.query for row in rows]
    else:
        # Fallback: top brands by listing count
        rows = (
            db.query(Listing.brand, func.count(Listing.id).label("cnt"))
            .filter(Listing.status == ListingStatus.active)
            .group_by(Listing.brand)
            .order_by(desc("cnt"))
            .limit(10)
            .all()
        )
        result = [row.brand for row in rows]

    _popular_cache["ts"] = now
    _popular_cache["data"] = result

    return ApiResponse(
        success=True,
        data=result,
        message="Popular searches fetched",
    )


# ---------------------------------------------------------------------------
# GET /search/trending
# ---------------------------------------------------------------------------

@router.get("/trending", response_model=ApiResponse[dict])
def trending(db: Session = Depends(get_db)):
    """
    Returns top 5 brands and top 5 cities with the most new active listings
    created in the past 7 days.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)

    brand_rows = (
        db.query(Listing.brand, func.count(Listing.id).label("cnt"))
        .filter(
            Listing.status == ListingStatus.active,
            Listing.created_at >= cutoff,
        )
        .group_by(Listing.brand)
        .order_by(desc("cnt"))
        .limit(5)
        .all()
    )

    city_rows = (
        db.query(Listing.city, func.count(Listing.id).label("cnt"))
        .filter(
            Listing.status == ListingStatus.active,
            Listing.created_at >= cutoff,
        )
        .group_by(Listing.city)
        .order_by(desc("cnt"))
        .limit(5)
        .all()
    )

    data = {
        "brands": [{"term": r.brand, "count": r.cnt} for r in brand_rows],
        "cities": [{"term": r.city,  "count": r.cnt} for r in city_rows],
    }

    return ApiResponse(success=True, data=data, message="Trending fetched")


# ---------------------------------------------------------------------------
# POST /search/log
# ---------------------------------------------------------------------------

@router.post("/log", response_model=ApiResponse[None])
@limiter.limit("30/minute")
def log_search_event(
    request: Request,
    query: str = Body(..., embed=True, min_length=1, max_length=500),
    results_count: int = Body(..., embed=True, ge=0),
    db: Session = Depends(get_db),
):
    """
    Logs a client-side search event for analytics.

    No auth required — user_id is always null from this endpoint.
    The main /search endpoint handles authenticated logging inline.
    """
    _log_search(db, query.strip(), results_count, user_id=None)
    return ApiResponse(success=True, data=None, message="Logged")


# ---------------------------------------------------------------------------
# GET /search/recommendations
# ---------------------------------------------------------------------------

@router.get("/recommendations", response_model=ApiResponse[list[ListingResponse]])
def recommendations(
    listing_id: Optional[UUID] = Query(
        default=None,
        description="When provided, return similar listings scored by multiple signals "
                    "excluding this listing. When omitted, return a mix of top-viewed "
                    "and recently created listings.",
    ),
    db: Session = Depends(get_db),
):
    """
    Returns up to 8 recommended listings.

    With listing_id:
      Fetches up to 100 candidates (same brand OR same city), scores each
      one in Python using a weighted multi-signal model, returns top 8.
      Supplements with global top-viewed if fewer than 4 scored results.

      Scoring weights:
        +40  same brand
        +20  same city
        +15  price within ±30% of anchor
        +10  year within ±3 of anchor
        +10  same fuel type
        +5   same transmission
        +0-10 view popularity: min(views / 10, 10)

    Without listing_id:
      Mix of top 4 by views + top 4 recently created (past 14 days).
      Deduplicated if overlap. Total up to 8.

    Images are eager-loaded via joinedload to prevent N+1 queries.
    """
    base = _active_base(db).options(joinedload(Listing.images))

    if listing_id is not None:
        anchor = (
            db.query(
                Listing.brand,
                Listing.city,
                Listing.price,
                Listing.year,
                Listing.fuel,
                Listing.transmission,
            )
            .filter(Listing.id == listing_id)
            .first()
        )

        if anchor is None:
            logger.warning(
                "recommendations: listing_id %s not found, falling back to global mix",
                listing_id,
            )
        else:
            # Fetch up to 100 candidates sharing brand or city
            candidates = (
                base
                .filter(
                    Listing.id != listing_id,
                    or_(
                        Listing.brand == anchor.brand,
                        Listing.city  == anchor.city,
                    ),
                )
                .limit(100)
                .all()
            )

            anchor_price = float(anchor.price) if anchor.price else None
            anchor_year  = anchor.year

            def _score(listing: Listing) -> float:
                score = 0.0
                if listing.brand == anchor.brand:
                    score += 40
                if listing.city == anchor.city:
                    score += 20
                if anchor_price and listing.price:
                    ratio = abs(float(listing.price) - anchor_price) / anchor_price
                    if ratio <= 0.30:
                        score += 15
                if anchor_year and listing.year:
                    if abs(listing.year - anchor_year) <= 3:
                        score += 10
                if anchor.fuel and listing.fuel == anchor.fuel:
                    score += 10
                if anchor.transmission and listing.transmission == anchor.transmission:
                    score += 5
                # View popularity bonus: max 10 points
                score += min(listing.views / 10.0, 10.0)
                return score

            scored = sorted(candidates, key=_score, reverse=True)[:8]

            if len(scored) < 4:
                # Supplement with global top-viewed excluding already-selected ids
                selected_ids = {l.id for l in scored} | {listing_id}
                supplement = (
                    base
                    .filter(Listing.id.notin_(selected_ids))
                    .order_by(Listing.views.desc())
                    .limit(8 - len(scored))
                    .all()
                )
                scored = scored + supplement

            return ApiResponse(
                success=True,
                data=[ListingResponse.model_validate(l) for l in scored],
                message=f"{len(scored)} recommendation(s) found",
            )

    # ------------------------------------------------------------------
    # Global mix: top-viewed + recently created, deduplicated
    # ------------------------------------------------------------------
    top_viewed = (
        base
        .order_by(Listing.views.desc())
        .limit(4)
        .all()
    )

    recent_cutoff = datetime.now(timezone.utc) - timedelta(days=14)
    top_viewed_ids = {l.id for l in top_viewed}

    recent = (
        base
        .filter(
            Listing.created_at >= recent_cutoff,
            Listing.id.notin_(top_viewed_ids),
        )
        .order_by(Listing.created_at.desc())
        .limit(4)
        .all()
    )

    mixed = top_viewed + recent   # already deduplicated via notin_

    return ApiResponse(
        success=True,
        data=[ListingResponse.model_validate(l) for l in mixed],
        message=f"{len(mixed)} recommendation(s) found",
    )
