"""
Vehicle catalog router.
Provides car makes and models from the local database.
"""
import time
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Brand, CarModel, User
from app.schemas import ApiResponse
from app.routers.admin import require_admin

router = APIRouter(prefix="/catalog/vehicle", tags=["vehicles"])

# These makes are popular in Tajikistan/CIS.
# They are always merged into the makes list if not in DB.
_EXTRA_MAKES = [
    "Toyota", "Hyundai", "Kia", "Chevrolet", "Mercedes-Benz", "BMW",
    "Lexus", "LADA", "Daewoo", "Nissan", "Mazda", "Honda", "Mitsubishi",
    "Skoda", "Peugeot", "Renault", "Ford", "Opel", "Volkswagen", "Audi",
    "Geely", "Chery", "Exeed", "Jetour", "Haval", "Tank", "BYD",
    "Changan", "Lifan", "JAC", "UAZ", "GAZ",
]


# ── Public: list all makes ────────────────────────────────────────────────────

@router.get("/makes", response_model=ApiResponse[list[str]])
async def get_makes(db: Session = Depends(get_db)):
    """Return all car makes: DB brands + popular extras."""
    # 1. DB brands
    db_names = [b.name for b in db.query(Brand).filter(Brand.is_active == True).all()]

    # 2. Merge, deduplicate, sort
    combined = set(db_names) | set(_EXTRA_MAKES)
    # "Другое" always goes last
    sorted_makes = sorted(n for n in combined if n not in ("Другое", "Other"))
    sorted_makes.append("Другое")

    return ApiResponse(success=True, data=sorted_makes, message="OK")


# ── Public: models for a make ─────────────────────────────────────────────────

@router.get("/models", response_model=ApiResponse[list[str]])
async def get_models(make: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    """Return all models for a given make from DB."""
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

    # Merge, deduplicate, sort — "Другое" last
    combined = set(db_models)
    sorted_models = sorted(m for m in combined if m not in ("Другое", "Other"))
    if make.strip().lower() != "другое":
        sorted_models.append("Другое")

    return ApiResponse(success=True, data=sorted_models, message="OK")

