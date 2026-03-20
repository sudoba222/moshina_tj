"""Public + admin CRUD for brands, models, categories."""
import math
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.auth import get_current_user
from app.database import get_db
from app.models import Banner, Brand, CarModel, Category, User
from app.schemas import ApiResponse
from app.routers.admin import require_admin, require_super_admin

router = APIRouter(prefix="/catalog", tags=["catalog"])

# ── Schemas ──────────────────────────────────────────────────────────────────

class BrandCreate(BaseModel):
    name: str
    slug: str
    logo_url: Optional[str] = None
    country: Optional[str] = None
    is_popular: bool = False

class BrandUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    logo_url: Optional[str] = None
    country: Optional[str] = None
    is_popular: Optional[bool] = None
    is_active: Optional[bool] = None

class ModelCreate(BaseModel):
    name: str

class CategoryCreate(BaseModel):
    name_ru: str
    name_tj: str
    slug: str
    icon_url: Optional[str] = None
    description_ru: Optional[str] = None
    description_tj: Optional[str] = None
    filter_config: Optional[dict] = None
    display_order: int = 0

class CategoryUpdate(BaseModel):
    name_ru: Optional[str] = None
    name_tj: Optional[str] = None
    slug: Optional[str] = None
    icon_url: Optional[str] = None
    description_ru: Optional[str] = None
    description_tj: Optional[str] = None
    filter_config: Optional[dict] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None

# ── Public endpoints ──────────────────────────────────────────────────────────

@router.get("/brands")
def list_brands(
    popular_only: bool = False,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Brand).filter(Brand.is_active == True)
    if popular_only:
        q = q.filter(Brand.is_popular == True)
    if search:
        q = q.filter(Brand.name.ilike(f"%{search}%"))
    brands = q.order_by(Brand.is_popular.desc(), Brand.name).all()
    return ApiResponse(success=True, data=[{
        "id": str(b.id), "name": b.name, "slug": b.slug,
        "logo_url": b.logo_url, "country": b.country, "is_popular": b.is_popular,
    } for b in brands], message="OK")

@router.get("/brands/{brand_id}/models")
def list_models(brand_id: str, db: Session = Depends(get_db)):
    brand = db.query(Brand).filter(Brand.id == brand_id, Brand.is_active == True).first()
    if not brand:
        # try by slug
        brand = db.query(Brand).filter(Brand.slug == brand_id, Brand.is_active == True).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    models = db.query(CarModel).filter(CarModel.brand_id == brand.id, CarModel.is_active == True).order_by(CarModel.name).all()
    return ApiResponse(success=True, data=[{"id": str(m.id), "name": m.name} for m in models], message="OK")

@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    cats = db.query(Category).filter(Category.is_active == True).order_by(Category.display_order, Category.name_ru).all()
    return ApiResponse(success=True, data=[{
        "id": str(c.id), "name_ru": c.name_ru, "name_tj": c.name_tj,
        "slug": c.slug, "icon_url": c.icon_url,
        "description_ru": c.description_ru, "description_tj": c.description_tj,
        "filter_config": c.filter_config, "display_order": c.display_order,
    } for c in cats], message="OK")

# ── Admin endpoints ───────────────────────────────────────────────────────────

@router.get("/admin/brands")
def admin_list_brands(
    page: int = Query(default=1, ge=1),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    q = db.query(Brand)
    if search:
        q = q.filter(Brand.name.ilike(f"%{search}%"))
    total = q.count()
    brands = q.order_by(Brand.is_popular.desc(), Brand.name).offset((page-1)*50).limit(50).all()
    return ApiResponse(success=True, data={
        "items": [{
            "id": str(b.id), "name": b.name, "slug": b.slug,
            "logo_url": b.logo_url, "country": b.country,
            "is_popular": b.is_popular, "is_active": b.is_active,
            "model_count": len(b.models),
        } for b in brands],
        "total": total, "page": page, "pages": math.ceil(total/50) if total else 1,
    }, message="OK")

@router.post("/admin/brands")
def create_brand(payload: BrandCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    if db.query(Brand).filter(Brand.name == payload.name).first():
        raise HTTPException(400, "Brand already exists")
    brand = Brand(**payload.model_dump())
    db.add(brand)
    db.commit()
    db.refresh(brand)
    return ApiResponse(success=True, data={"id": str(brand.id), "name": brand.name}, message="Created")

@router.put("/admin/brands/{brand_id}")
def update_brand(brand_id: str, payload: BrandUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(404, "Not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(brand, k, v)
    db.commit()
    db.refresh(brand)
    return ApiResponse(success=True, data={"id": str(brand.id), "name": brand.name, "is_active": brand.is_active}, message="Updated")

@router.delete("/admin/brands/{brand_id}")
def delete_brand(brand_id: str, db: Session = Depends(get_db), _: User = Depends(require_super_admin)):
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(404, "Not found")
    db.delete(brand)
    db.commit()
    return ApiResponse(success=True, data=None, message="Deleted")

@router.post("/admin/brands/{brand_id}/models")
def add_model(brand_id: str, payload: ModelCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(404, "Brand not found")
    existing = db.query(CarModel).filter(CarModel.brand_id == brand.id, CarModel.name == payload.name).first()
    if existing:
        raise HTTPException(400, "Model already exists")
    model = CarModel(brand_id=brand.id, name=payload.name)
    db.add(model)
    db.commit()
    db.refresh(model)
    return ApiResponse(success=True, data={"id": str(model.id), "name": model.name}, message="Created")

@router.delete("/admin/brands/{brand_id}/models/{model_id}")
def delete_model(brand_id: str, model_id: str, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    model = db.query(CarModel).filter(CarModel.id == model_id, CarModel.brand_id == brand_id).first()
    if not model:
        raise HTTPException(404, "Not found")
    db.delete(model)
    db.commit()
    return ApiResponse(success=True, data=None, message="Deleted")

@router.get("/admin/categories")
def admin_list_categories(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    cats = db.query(Category).order_by(Category.display_order, Category.name_ru).all()
    return ApiResponse(success=True, data=[{
        "id": str(c.id), "name_ru": c.name_ru, "name_tj": c.name_tj,
        "slug": c.slug, "icon_url": c.icon_url, "description_ru": c.description_ru,
        "description_tj": c.description_tj, "filter_config": c.filter_config,
        "display_order": c.display_order, "is_active": c.is_active,
    } for c in cats], message="OK")

@router.post("/admin/categories")
def create_category(payload: CategoryCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    if db.query(Category).filter(Category.slug == payload.slug).first():
        raise HTTPException(400, "Slug already exists")
    cat = Category(**payload.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return ApiResponse(success=True, data={"id": str(cat.id), "name_ru": cat.name_ru}, message="Created")

@router.put("/admin/categories/{cat_id}")
def update_category(cat_id: str, payload: CategoryUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    cat = db.query(Category).filter(Category.id == cat_id).first()
    if not cat:
        raise HTTPException(404, "Not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(cat, k, v)
    db.commit()
    db.refresh(cat)
    return ApiResponse(success=True, data={"id": str(cat.id)}, message="Updated")

@router.delete("/admin/categories/{cat_id}")
def delete_category(cat_id: str, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    cat = db.query(Category).filter(Category.id == cat_id).first()
    if not cat:
        raise HTTPException(404, "Not found")
    db.delete(cat)
    db.commit()
    return ApiResponse(success=True, data=None, message="Deleted")


# ── Banner schemas ────────────────────────────────────────────────────────────

class BannerCreate(BaseModel):
    title_ru: str
    title_tj: str
    subtitle_ru: Optional[str] = None
    subtitle_tj: Optional[str] = None
    image_url: str
    link_url: Optional[str] = None
    display_order: int = 0

class BannerUpdate(BaseModel):
    title_ru: Optional[str] = None
    title_tj: Optional[str] = None
    subtitle_ru: Optional[str] = None
    subtitle_tj: Optional[str] = None
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None

def _banner_dict(b: Banner) -> dict:
    return {
        "id": str(b.id), "title_ru": b.title_ru, "title_tj": b.title_tj,
        "subtitle_ru": b.subtitle_ru, "subtitle_tj": b.subtitle_tj,
        "image_url": b.image_url, "link_url": b.link_url,
        "is_active": b.is_active, "display_order": b.display_order,
    }

# ── Public banner endpoint ────────────────────────────────────────────────────

@router.get("/banners")
def list_banners(db: Session = Depends(get_db)):
    banners = db.query(Banner).filter(Banner.is_active == True).order_by(Banner.display_order, Banner.created_at).all()
    return ApiResponse(success=True, data=[_banner_dict(b) for b in banners], message="OK")

# ── Admin banner CRUD ─────────────────────────────────────────────────────────

@router.get("/admin/banners")
def admin_list_banners(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    banners = db.query(Banner).order_by(Banner.display_order, Banner.created_at).all()
    return ApiResponse(success=True, data=[_banner_dict(b) for b in banners], message="OK")

@router.post("/admin/banners")
def create_banner(payload: BannerCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    banner = Banner(**payload.model_dump())
    db.add(banner)
    db.commit()
    db.refresh(banner)
    return ApiResponse(success=True, data=_banner_dict(banner), message="Created")

@router.put("/admin/banners/{banner_id}")
def update_banner(banner_id: str, payload: BannerUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(404, "Not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(banner, k, v)
    db.commit()
    db.refresh(banner)
    return ApiResponse(success=True, data=_banner_dict(banner), message="Updated")

@router.delete("/admin/banners/{banner_id}")
def delete_banner(banner_id: str, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(404, "Not found")
    db.delete(banner)
    db.commit()
    return ApiResponse(success=True, data=None, message="Deleted")
