"""
Search router — provides four endpoints:

    GET /search                  Multi-strategy full-text + fuzzy search
    GET /search/suggestions      Autocomplete brand/model names
    GET /search/did-you-mean     Spelling correction for a query
    GET /search/recommendations  Top-viewed or contextually similar listings

PostgreSQL extensions required (handled by migration c3d4e5f6a7b8):
    pg_trgm        — similarity(), word_similarity(), trigram indexes
    fuzzystrmatch  — levenshtein()
"""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import Float, Integer, cast, func, literal, or_, text, union
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Listing, ListingStatus
from app.schemas import ApiResponse, ListingResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/search", tags=["search"])
limiter = Limiter(key_func=get_remote_address)

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

# Minimum trigram similarity threshold for the fuzzy fallback pass.
_TRGM_SIMILARITY_THRESHOLD = 0.2

# Minimum word-similarity score used in /suggestions.
_SUGGESTION_THRESHOLD = 0.3

# Levenshtein / similarity thresholds for /did-you-mean.
_DYM_SIMILARITY_GOOD_ENOUGH = 0.8   # skip correction — query already matches well
_DYM_SIMILARITY_MIN = 0.3           # candidate must be at least this similar
_DYM_EDIT_RATIO_MAX = 0.5           # edit distance must be <= len(q) * this


def _active_base(db: Session):
    """Return a base query restricted to active listings."""
    return db.query(Listing).filter(Listing.status == ListingStatus.active)


# ---------------------------------------------------------------------------
# GET /search
# ---------------------------------------------------------------------------

@router.get("", response_model=ApiResponse[list[ListingResponse]])
@limiter.limit("30/minute")
def search_listings(
    request: Request,
    q: str = Query(..., min_length=1, max_length=100, description="Search term — brand, model, or city"),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Multi-strategy search with automatic fallback:

    1. tsvector full-text search  — fast, language-aware, ordered by ts_rank
    2. pg_trgm trigram similarity  — typo-tolerant, similarity > 0.2
    3. ILIKE                       — last-resort substring match

    Only active listings are returned. Images are eager-loaded via joinedload
    to prevent N+1 queries.
    """
    q = q.strip()

    # ------------------------------------------------------------------
    # Strategy 1: tsvector full-text search
    # ------------------------------------------------------------------
    search_vector = func.to_tsvector(
        "simple",
        func.concat_ws(" ", Listing.brand, Listing.model, Listing.city),
    )
    ts_query = func.plainto_tsquery("simple", q)
    ts_rank_expr = func.ts_rank(search_vector, ts_query)

    listings = (
        _active_base(db)
        .options(joinedload(Listing.images))
        .filter(search_vector.op("@@")(ts_query))
        .order_by(ts_rank_expr.desc(), Listing.views.desc())
        .limit(limit)
        .all()
    )

    if listings:
        return ApiResponse(
            success=True,
            data=[ListingResponse.model_validate(l) for l in listings],
            message=f"{len(listings)} result(s) found",
        )

    # ------------------------------------------------------------------
    # Strategy 2: trigram similarity (pg_trgm)
    # Handles typos and close spellings. similarity() returns 0..1.
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
        return ApiResponse(
            success=True,
            data=[ListingResponse.model_validate(l) for l in listings],
            message=f"{len(listings)} result(s) found",
        )

    # ------------------------------------------------------------------
    # Strategy 3: ILIKE substring match
    # Broadest net — returns anything that contains the query string.
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
            )
        )
        .order_by(Listing.views.desc())
        .limit(limit)
        .all()
    )

    return ApiResponse(
        success=True,
        data=[ListingResponse.model_validate(l) for l in listings],
        message=f"{len(listings)} result(s) found",
    )


# ---------------------------------------------------------------------------
# GET /search/suggestions
# ---------------------------------------------------------------------------

@router.get("/suggestions", response_model=ApiResponse[list[str]])
@limiter.limit("60/minute")
def search_suggestions(
    request: Request,
    q: str = Query(..., min_length=1, max_length=100, description="Partial search term for autocomplete"),
    db: Session = Depends(get_db),
):
    """
    Returns up to 10 distinct autocomplete suggestions drawn from the brand and
    model columns of active listings.

    Two candidate sets are combined before deduplication:
      - Trigram word-similarity > 0.3  (handles typos mid-word)
      - Exact prefix match via ILIKE   (fast, no typo tolerance)

    Results are sorted by descending word_similarity so the most relevant
    suggestion appears first.
    """
    q = q.strip()
    prefix_pattern = f"{q}%"

    # word_similarity matches the query against individual words in the column
    # value, which works better than full similarity() for partial tokens.
    brand_ws = func.word_similarity(q, Listing.brand)
    model_ws = func.word_similarity(q, Listing.model)

    # --- Brand candidates ---
    brand_trgm = (
        db.query(Listing.brand.label("term"), brand_ws.label("score"))
        .filter(
            Listing.status == ListingStatus.active,
            brand_ws > _SUGGESTION_THRESHOLD,
        )
        .distinct()
    )

    brand_prefix = (
        db.query(Listing.brand.label("term"), literal(1.0).label("score"))
        .filter(
            Listing.status == ListingStatus.active,
            Listing.brand.ilike(prefix_pattern),
        )
        .distinct()
    )

    # --- Model candidates ---
    model_trgm = (
        db.query(Listing.model.label("term"), model_ws.label("score"))
        .filter(
            Listing.status == ListingStatus.active,
            model_ws > _SUGGESTION_THRESHOLD,
        )
        .distinct()
    )

    model_prefix = (
        db.query(Listing.model.label("term"), literal(1.0).label("score"))
        .filter(
            Listing.status == ListingStatus.active,
            Listing.model.ilike(prefix_pattern),
        )
        .distinct()
    )

    # UNION merges all four candidate sets; duplicates on (term, score) are
    # collapsed. We then pick distinct terms sorted by best score descending.
    combined = union(brand_trgm, brand_prefix, model_trgm, model_prefix).subquery()

    rows = (
        db.query(
            combined.c.term,
            func.max(cast(combined.c.score, Float)).label("best_score"),
        )
        .group_by(combined.c.term)
        .order_by(func.max(cast(combined.c.score, Float)).desc())
        .limit(10)
        .all()
    )

    suggestions = [row.term for row in rows if row.term]

    return ApiResponse(
        success=True,
        data=suggestions,
        message=f"{len(suggestions)} suggestion(s) returned",
    )


# ---------------------------------------------------------------------------
# GET /search/did-you-mean
# ---------------------------------------------------------------------------

@router.get("/did-you-mean", response_model=ApiResponse[Optional[str]])
@limiter.limit("30/minute")
def did_you_mean(
    request: Request,
    q: str = Query(..., min_length=1, max_length=100, description="Query to find a spelling correction for"),
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

    # levenshtein() is provided by the fuzzystrmatch extension.
    # similarity() is provided by pg_trgm.
    brand_edit = func.levenshtein(func.lower(Listing.brand), q_lower)
    model_edit = func.levenshtein(func.lower(Listing.model), q_lower)
    brand_sim  = func.similarity(Listing.brand, q)
    model_sim  = func.similarity(Listing.model, q)

    # Collect one best candidate per column, then pick the global winner.
    # Using func.least/greatest keeps this in a single round-trip.
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

    # Merge the two candidates and pick the one with the highest similarity.
    candidates = brand_rows + model_rows
    if not candidates:
        return ApiResponse(success=True, data=None, message="No correction found")

    best = max(candidates, key=lambda r: r.sim)

    # If the query already matches closely enough, skip the suggestion.
    if best.sim >= _DYM_SIMILARITY_GOOD_ENOUGH:
        return ApiResponse(success=True, data=None, message="Query already matches well")

    return ApiResponse(
        success=True,
        data=best.term,
        message="Did you mean this?",
    )


# ---------------------------------------------------------------------------
# GET /search/recommendations
# ---------------------------------------------------------------------------

@router.get("/recommendations", response_model=ApiResponse[list[ListingResponse]])
@limiter.limit("30/minute")
def recommendations(
    request: Request,
    listing_id: Optional[UUID] = Query(
        default=None,
        description="When provided, return similar listings (same brand or city) "
                    "excluding this listing. When omitted, return global top-viewed.",
    ),
    db: Session = Depends(get_db),
):
    """
    Returns up to 8 recommended listings.

    Behaviour:
      - No listing_id → global top 8 by view count (homepage feed).
      - listing_id provided → listings sharing the same brand OR city as the
        given listing, ordered by views, excluding that listing itself.

    Images are eager-loaded via joinedload to prevent N+1 queries.
    """
    base = _active_base(db).options(joinedload(Listing.images))

    if listing_id is not None:
        # Fetch the anchor listing to read its brand and city.
        anchor = (
            db.query(Listing.brand, Listing.city)
            .filter(Listing.id == listing_id)
            .first()
        )

        if anchor is None:
            # Anchor not found or not active — fall back to global top-viewed.
            logger.warning(
                "recommendations: listing_id %s not found, falling back to global top-viewed",
                listing_id,
            )
        else:
            listings = (
                base
                .filter(
                    Listing.id != listing_id,
                    or_(
                        Listing.brand == anchor.brand,
                        Listing.city  == anchor.city,
                    ),
                )
                .order_by(Listing.views.desc())
                .limit(8)
                .all()
            )
            return ApiResponse(
                success=True,
                data=[ListingResponse.model_validate(l) for l in listings],
                message=f"{len(listings)} recommendation(s) found",
            )

    # Global top-viewed fallback (no listing_id, or anchor not found).
    listings = (
        base
        .order_by(Listing.views.desc())
        .limit(8)
        .all()
    )

    return ApiResponse(
        success=True,
        data=[ListingResponse.model_validate(l) for l in listings],
        message=f"{len(listings)} recommendation(s) found",
    )
