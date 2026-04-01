"""
NHTSA vehicle make/model proxy with 24-hour in-memory cache.
NHTSA is a free US government API — no key required.
We merge its ~11 000 vehicles with any brands/models stored in our DB.

Public endpoints:
  GET /catalog/vehicle/makes           — all known makes (NHTSA + DB)
  GET /catalog/vehicle/models?make=X   — models for a given make
  GET /catalog/vehicle/search?q=X      — quick brand/model search

Admin endpoint:
  POST /catalog/vehicle/admin/import   — import NHTSA data into the Brand/CarModel tables
"""
import time
import httpx
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Brand, CarModel, User
from app.schemas import ApiResponse
from app.routers.admin import require_admin

router = APIRouter(prefix="/catalog/vehicle", tags=["vehicles"])

# ── In-memory cache ───────────────────────────────────────────────────────────
_CACHE_TTL = 86_400        # 24 hours in seconds
_makes_cache: dict = {}    # {"data": [...], "ts": float}
_models_cache: dict = {}   # {make_lower: {"data": [...], "ts": float}}

NHTSA_BASE = "https://vpic.nhtsa.dot.gov/api/vehicles"

# These makes are popular in Tajikistan/CIS but thin or absent in NHTSA.
# They are always merged into the makes list.
_EXTRA_MAKES = [
    "Geely", "Chery", "Exeed", "Jetour", "Haval", "Tank", "Ora", "Wey",
    "Changan", "Deepal", "Avatr", "BYD", "GAC", "Great Wall", "MG",
    "Roewe", "BAIC", "Dongfeng", "Voyah", "FAW", "Hongqi", "Nio",
    "Li Auto", "Xpeng", "Lynk & Co", "AITO", "Lifan", "JAC", "Foton",
    "DFSK", "Brilliance", "Zotye", "Zeekr", "Omoda", "Jaecoo",
    "Lada", "Daewoo", "UAZ", "GAZ", "KamAZ", "MAZ",
]


def _cache_valid(entry: dict) -> bool:
    return bool(entry) and (time.time() - entry.get("ts", 0)) < _CACHE_TTL


async def _fetch_nhtsa_makes() -> list[str]:
    """Fetch all makes from NHTSA. Returns sorted list of make names."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{NHTSA_BASE}/GetAllMakes?format=json")
        resp.raise_for_status()
        results = resp.json().get("Results", [])
    names = sorted({r["Make_Name"].title() for r in results if r.get("Make_Name")})
    return names


async def _fetch_nhtsa_models(make: str) -> list[str]:
    """Fetch all models for a given make from NHTSA."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{NHTSA_BASE}/GetModelsForMake/{httpx.URL(make)}?format=json"
        )
        resp.raise_for_status()
        results = resp.json().get("Results", [])
    return sorted({r["Model_Name"] for r in results if r.get("Model_Name")})


# ── Public: list all makes ────────────────────────────────────────────────────

@router.get("/makes", response_model=ApiResponse[list[str]])
async def get_makes(db: Session = Depends(get_db)):
    """Return all car makes: DB brands + NHTSA + extra CIS/Chinese brands."""
    global _makes_cache

    if not _cache_valid(_makes_cache):
        # 1. DB brands
        db_names = [b.name for b in db.query(Brand).filter(Brand.is_active == True).all()]

        # 2. NHTSA (best-effort)
        nhtsa_names: list[str] = []
        try:
            nhtsa_names = await _fetch_nhtsa_makes()
        except Exception:
            pass  # fall back to DB + extras only

        # 3. Merge, deduplicate, sort — put extras first if not already present
        combined = set(db_names) | set(nhtsa_names) | set(_EXTRA_MAKES)
        # "Другое" always goes last
        sorted_makes = sorted(n for n in combined if n not in ("Другое", "Other"))
        sorted_makes.append("Другое")

        _makes_cache = {"data": sorted_makes, "ts": time.time()}

    return ApiResponse(success=True, data=_makes_cache["data"], message="OK")


# ── Public: models for a make ─────────────────────────────────────────────────

@router.get("/models", response_model=ApiResponse[list[str]])
async def get_models(make: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    """Return all models for a given make: DB models + NHTSA models."""
    global _models_cache

    key = make.strip().lower()
    entry = _models_cache.get(key, {})

    if not _cache_valid(entry):
        # 1. DB models for this brand (by name, case-insensitive)
        brand = (
            db.query(Brand)
            .filter(Brand.name.ilike(make.strip()), Brand.is_active == True)
            .first()
        )
        db_models: list[str] = []
        if brand:
            db_models = [
                m.name for m in
                db.query(CarModel)
                .filter(CarModel.brand_id == brand.id, CarModel.is_active == True)
                .order_by(CarModel.name)
                .all()
            ]

        # 2. NHTSA models (best-effort)
        nhtsa_models: list[str] = []
        try:
            nhtsa_models = await _fetch_nhtsa_models(make.strip())
        except Exception:
            pass

        # 3. Merge, deduplicate, sort — "Другое" last
        combined = set(db_models) | set(nhtsa_models)
        sorted_models = sorted(m for m in combined if m not in ("Другое", "Other"))
        if make.strip().lower() != "другое":
            sorted_models.append("Другое")

        _models_cache[key] = {"data": sorted_models, "ts": time.time()}

    return ApiResponse(success=True, data=_models_cache[key]["data"], message="OK")


# ── Public: quick search ──────────────────────────────────────────────────────

@router.get("/search", response_model=ApiResponse[list[dict]])
async def search_vehicles(q: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    """Quick prefix search across makes stored in the DB + extra list."""
    q_lower = q.strip().lower()

    # DB brands
    db_brands = (
        db.query(Brand)
        .filter(Brand.name.ilike(f"%{q}%"), Brand.is_active == True)
        .order_by(Brand.is_popular.desc(), Brand.name)
        .limit(10)
        .all()
    )
    results = [{"make": b.name, "source": "db"} for b in db_brands]

    # Extra makes (not yet in DB)
    existing = {r["make"].lower() for r in results}
    for make in _EXTRA_MAKES:
        if q_lower in make.lower() and make.lower() not in existing:
            results.append({"make": make, "source": "extra"})
        if len(results) >= 12:
            break

    return ApiResponse(success=True, data=results[:12], message="OK")


# ── Admin: import NHTSA → DB ──────────────────────────────────────────────────

@router.post("/admin/import", response_model=ApiResponse[dict])
async def import_nhtsa(
    makes_only: bool = Query(default=False, description="Import makes only, skip models"),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """
    Fetch all makes (and optionally models) from NHTSA and upsert into Brand/CarModel tables.
    This is a slow operation — run once or periodically from a cron/admin action.
    """
    import re

    def to_slug(name: str) -> str:
        return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")

    # Step 1: fetch makes
    try:
        nhtsa_makes = await _fetch_nhtsa_makes()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"NHTSA unreachable: {exc}")

    added_makes = 0
    for make_name in nhtsa_makes:
        existing = db.query(Brand).filter(Brand.name.ilike(make_name)).first()
        if not existing:
            slug = to_slug(make_name)
            # Ensure slug uniqueness
            base_slug, n = slug, 1
            while db.query(Brand).filter(Brand.slug == slug).first():
                slug = f"{base_slug}-{n}"
                n += 1
            db.add(Brand(name=make_name, slug=slug, country="US"))
            added_makes += 1

    # Also upsert extra CIS/Chinese makes
    for make_name in _EXTRA_MAKES:
        existing = db.query(Brand).filter(Brand.name.ilike(make_name)).first()
        if not existing:
            slug = to_slug(make_name)
            base_slug, n = slug, 1
            while db.query(Brand).filter(Brand.slug == slug).first():
                slug = f"{base_slug}-{n}"
                n += 1
            db.add(Brand(name=make_name, slug=slug))
            added_makes += 1

    db.commit()

    if makes_only:
        return ApiResponse(success=True, data={"added_makes": added_makes, "added_models": 0}, message="Makes imported")

    # Step 2: import models for each brand in DB
    all_brands = db.query(Brand).filter(Brand.is_active == True).all()
    added_models = 0
    for brand in all_brands:
        try:
            models = await _fetch_nhtsa_models(brand.name)
        except Exception:
            continue
        for model_name in models:
            exists = db.query(CarModel).filter(
                CarModel.brand_id == brand.id,
                CarModel.name.ilike(model_name),
            ).first()
            if not exists:
                db.add(CarModel(brand_id=brand.id, name=model_name))
                added_models += 1
        db.commit()

    # Invalidate cache
    global _makes_cache, _models_cache
    _makes_cache = {}
    _models_cache = {}

    return ApiResponse(
        success=True,
        data={"added_makes": added_makes, "added_models": added_models},
        message="NHTSA import complete",
    )
