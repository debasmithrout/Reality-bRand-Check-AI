from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_editor
from app.database.connection import get_db
from app.models.profile import Profile
from app.schemas.brand import BrandCreate, BrandResponse, BrandUpdate
from app.schemas.common import APIResponse
from app.services.brand_service import BrandService

router = APIRouter(prefix="/brands", tags=["Brands"])


@router.post("", response_model=APIResponse[BrandResponse], status_code=status.HTTP_201_CREATED)
def create_brand(
    payload: BrandCreate,
    current_user: Profile = Depends(require_editor),
    db: Session = Depends(get_db),
):
    """
    Create a new brand within the user's workspace.
    """
    brand = BrandService.create_brand(db, payload, current_user)
    return APIResponse(data=BrandResponse.model_validate(brand), message="Brand created successfully.")


@router.get("", response_model=APIResponse[List[BrandResponse]])
def list_brands(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List all brands accessible to the authenticated user's workspace.
    """
    brands = BrandService.list_brands(db, current_user, is_active=is_active)
    data = [BrandResponse.model_validate(b) for b in brands]
    return APIResponse(data=data)


@router.get("/{brand_id}", response_model=APIResponse[BrandResponse])
def get_brand(
    brand_id: str,
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get brand details by brand ID.
    """
    brand = BrandService.get_accessible_brand(db, brand_id, current_user)
    return APIResponse(data=BrandResponse.model_validate(brand))


@router.patch("/{brand_id}", response_model=APIResponse[BrandResponse])
def update_brand(
    brand_id: str,
    payload: BrandUpdate,
    current_user: Profile = Depends(require_editor),
    db: Session = Depends(get_db),
):
    """
    Update brand details.
    """
    brand = BrandService.update_brand(db, brand_id, payload, current_user)
    return APIResponse(data=BrandResponse.model_validate(brand), message="Brand updated successfully.")


@router.delete("/{brand_id}", response_model=APIResponse[dict])
def delete_brand(
    brand_id: str,
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete a brand and its associated guidelines, terminology, and facts.
    """
    BrandService.delete_brand(db, brand_id, current_user)
    return APIResponse(data={"id": brand_id, "deleted": True}, message="Brand deleted successfully.")

