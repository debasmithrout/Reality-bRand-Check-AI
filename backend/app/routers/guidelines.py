from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_editor
from app.core.errors import NotFoundException
from app.database.connection import get_db
from app.models.guideline import Guideline
from app.models.profile import Profile
from app.schemas.common import APIResponse
from app.schemas.guideline import GuidelineCreate, GuidelineResponse, GuidelineUpdate
from app.services.brand_service import BrandService

router = APIRouter(tags=["Guidelines"])


@router.post("/brands/{brand_id}/guidelines", response_model=APIResponse[GuidelineResponse], status_code=status.HTTP_201_CREATED)
def create_or_set_guideline(
    brand_id: str,
    payload: GuidelineCreate,
    current_user: Profile = Depends(require_editor),
    db: Session = Depends(get_db),
):
    """
    Create or update guidelines for a specific brand.
    """
    BrandService.get_accessible_brand(db, brand_id, current_user)
    
    # Check if a guideline already exists for this brand
    guideline = db.query(Guideline).filter(Guideline.brand_id == brand_id).first()
    if not guideline:
        guideline = Guideline(
            brand_id=brand_id,
            brand_personality=payload.brand_personality,
            tone_of_voice=payload.tone_of_voice,
            messaging_rules=payload.messaging_rules,
            additional_guidelines=payload.additional_guidelines,
        )
        db.add(guideline)
    else:
        guideline.brand_personality = payload.brand_personality
        guideline.tone_of_voice = payload.tone_of_voice
        guideline.messaging_rules = payload.messaging_rules
        guideline.additional_guidelines = payload.additional_guidelines

    db.commit()
    db.refresh(guideline)
    return APIResponse(data=GuidelineResponse.model_validate(guideline), message="Brand guidelines saved successfully.")


@router.get("/brands/{brand_id}/guidelines", response_model=APIResponse[Optional[GuidelineResponse]])
def get_brand_guidelines(
    brand_id: str,
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve guidelines for a brand.
    """
    BrandService.get_accessible_brand(db, brand_id, current_user)
    guideline = db.query(Guideline).filter(Guideline.brand_id == brand_id).first()
    data = GuidelineResponse.model_validate(guideline) if guideline else None
    return APIResponse(data=data)


@router.patch("/guidelines/{guideline_id}", response_model=APIResponse[GuidelineResponse])
def update_guideline(
    guideline_id: str,
    payload: GuidelineUpdate,
    current_user: Profile = Depends(require_editor),
    db: Session = Depends(get_db),
):
    """
    Update specific brand guideline fields.
    """
    guideline = db.query(Guideline).filter(Guideline.id == guideline_id).first()
    if not guideline:
        raise NotFoundException("Guideline", guideline_id)

    # Verify workspace access
    BrandService.get_accessible_brand(db, guideline.brand_id, current_user)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(guideline, field, value)

    db.commit()
    db.refresh(guideline)
    return APIResponse(data=GuidelineResponse.model_validate(guideline), message="Guideline updated successfully.")

