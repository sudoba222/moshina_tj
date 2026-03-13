from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import get_db
from app.models import Dealer, Listing, User
from app.schemas import (
    ApiResponse,
    DealerCreate,
    DealerDetailResponse,
    DealerResponse,
    ListingResponse,
)

router = APIRouter(prefix="/dealers", tags=["dealers"])


@router.get("", response_model=ApiResponse[list[DealerResponse]])
def list_dealers(db: Session = Depends(get_db)):
    dealers = db.query(Dealer).filter(Dealer.verified == True).all()
    return ApiResponse(
        success=True,
        data=[DealerResponse.model_validate(d) for d in dealers],
        message="Dealers fetched",
    )


@router.get("/{dealer_id}", response_model=ApiResponse[DealerDetailResponse])
def get_dealer(dealer_id: str, db: Session = Depends(get_db)):
    dealer = db.query(Dealer).filter(Dealer.id == dealer_id).first()
    if not dealer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dealer not found")

    listings = (
        db.query(Listing)
        .options(joinedload(Listing.images))
        .filter(Listing.user_id == dealer.user_id, Listing.is_active == True)
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
def create_dealer(
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
    db.commit()
    db.refresh(dealer)

    return ApiResponse(
        success=True,
        data=DealerResponse.model_validate(dealer),
        message="Dealer profile created. Awaiting verification.",
    )
