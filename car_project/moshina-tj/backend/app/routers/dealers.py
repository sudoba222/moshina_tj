import math

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import get_db
from app.limiter import limiter
from app.models import Dealer, Listing, ListingStatus, User, UserRole
from app.schemas import (
    ApiResponse,
    DealerCreate,
    DealerDetailResponse,
    DealerResponse,
    DealerUpdate,
    ListingResponse,
)

router = APIRouter(prefix="/dealers", tags=["dealers"])


@router.get("", response_model=ApiResponse[dict])
def list_dealers(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Dealer).filter(Dealer.verified == True)
    total = query.count()
    pages = math.ceil(total / limit) if total > 0 else 1
    dealers = query.order_by(Dealer.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return ApiResponse(
        success=True,
        data={
            "items": [DealerResponse.model_validate(d) for d in dealers],
            "total": total,
            "page": page,
            "pages": pages,
        },
        message="Dealers fetched",
    )


@router.get("/my", response_model=ApiResponse[DealerResponse])
def get_my_dealer_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the dealer profile for the currently authenticated user."""
    dealer = db.query(Dealer).filter(Dealer.user_id == current_user.id).first()
    if not dealer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dealer profile not found")
    return ApiResponse(success=True, data=DealerResponse.model_validate(dealer), message="")


@router.get("/{dealer_id}", response_model=ApiResponse[DealerDetailResponse])
def get_dealer(dealer_id: str, db: Session = Depends(get_db)):
    dealer = db.query(Dealer).filter(Dealer.id == dealer_id).first()
    if not dealer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dealer not found")

    listings = (
        db.query(Listing)
        .options(joinedload(Listing.images), joinedload(Listing.user))
        .filter(
            Listing.user_id == dealer.user_id,
            Listing.status == ListingStatus.active,
            Listing.is_active == True,
            Listing.is_deleted == False,
        )
        .order_by(Listing.created_at.desc())
        .all()
    )

    return ApiResponse(
        success=True,
        data=DealerDetailResponse(
            dealer=DealerResponse.model_validate(dealer),
            listings=[ListingResponse.model_validate(l) for l in listings],
        ),
        message="Dealer fetched",
    )


@router.post("", response_model=ApiResponse[DealerResponse], status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")
def create_dealer(
    request: Request,
    payload: DealerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.dealer_profile is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have a dealer profile",
        )

    dealer = Dealer(
        user_id=current_user.id,
        business_name=payload.business_name,
        city=payload.city,
        address=payload.address,
        phone=payload.phone,
        description=payload.description,
    )
    db.add(dealer)

    # Upgrade role to dealer if not already
    if current_user.role == UserRole.user:
        current_user.role = UserRole.dealer

    db.commit()
    db.refresh(dealer)

    return ApiResponse(
        success=True,
        data=DealerResponse.model_validate(dealer),
        message="Dealer profile created. Awaiting verification.",
    )


@router.put("/{dealer_id}", response_model=ApiResponse[DealerResponse])
def update_dealer(
    dealer_id: str,
    payload: DealerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a dealer profile. Only the owner or an admin can update."""
    dealer = db.query(Dealer).filter(Dealer.id == dealer_id).first()
    if not dealer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dealer not found")

    is_owner = dealer.user_id == current_user.id
    is_admin = current_user.role in {UserRole.admin, UserRole.moderator, UserRole.manager}
    if not (is_owner or is_admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorised")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(dealer, field, value)

    db.commit()
    db.refresh(dealer)
    return ApiResponse(success=True, data=DealerResponse.model_validate(dealer), message="Dealer profile updated")
