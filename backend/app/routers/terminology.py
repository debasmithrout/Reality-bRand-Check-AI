from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_editor
from app.core.errors import NotFoundException
from app.database.connection import get_db
from app.models.profile import Profile
from app.models.terminology import Terminology
from app.schemas.common import APIResponse
from app.schemas.terminology import (
    TerminologyCreate,
    TerminologyResponse,
    TerminologyUpdate,
)
from app.services.brand_service import BrandService

router = APIRouter(tags=["Terminology"])


@router.post("/brands/{brand_id}/terminology", response_model=APIResponse[TerminologyResponse], status_code=status.HTTP_201_CREATED)
def create_terminology(
    brand_id: str,
    payload: TerminologyCreate,
    current_user: Profile = Depends(require_editor),
    db: Session = Depends(get_db),
):
    """
    Add an approved, prohibited, or preferred term to a brand's dictionary.
    """
    BrandService.get_accessible_brand(db, brand_id, current_user)

    term_obj = Terminology(
        brand_id=brand_id,
        term=payload.term.strip(),
        term_type=payload.term_type,
        preferred_replacement=payload.preferred_replacement,
        description=payload.description,
        is_case_sensitive=payload.is_case_sensitive or False,
    )
    db.add(term_obj)
    db.commit()
    db.refresh(term_obj)

    return APIResponse(data=TerminologyResponse.model_validate(term_obj), message="Term added successfully.")


@router.get("/brands/{brand_id}/terminology", response_model=APIResponse[List[TerminologyResponse]])
def list_brand_terminology(
    brand_id: str,
    term_type: Optional[str] = Query(None, description="Filter by term type: APPROVED, PROHIBITED, PREFERRED"),
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List all terminology rules for a brand.
    """
    BrandService.get_accessible_brand(db, brand_id, current_user)

    query = db.query(Terminology).filter(Terminology.brand_id == brand_id)
    if term_type:
        query = query.filter(Terminology.term_type == term_type.upper())

    terms = query.order_by(Terminology.term.asc()).all()
    data = [TerminologyResponse.model_validate(t) for t in terms]
    return APIResponse(data=data)


@router.patch("/terminology/{term_id}", response_model=APIResponse[TerminologyResponse])
def update_terminology(
    term_id: str,
    payload: TerminologyUpdate,
    current_user: Profile = Depends(require_editor),
    db: Session = Depends(get_db),
):
    """
    Update a terminology rule.
    """
    term_obj = db.query(Terminology).filter(Terminology.id == term_id).first()
    if not term_obj:
        raise NotFoundException("Terminology", term_id)

    BrandService.get_accessible_brand(db, term_obj.brand_id, current_user)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(term_obj, field, value)

    db.commit()
    db.refresh(term_obj)
    return APIResponse(data=TerminologyResponse.model_validate(term_obj), message="Term updated successfully.")


@router.delete("/terminology/{term_id}", response_model=APIResponse[dict])
def delete_terminology(
    term_id: str,
    current_user: Profile = Depends(require_editor),
    db: Session = Depends(get_db),
):
    """
    Delete a terminology rule.
    """
    term_obj = db.query(Terminology).filter(Terminology.id == term_id).first()
    if not term_obj:
        raise NotFoundException("Terminology", term_id)

    BrandService.get_accessible_brand(db, term_obj.brand_id, current_user)

    db.delete(term_obj)
    db.commit()
    return APIResponse(data={"id": term_id, "deleted": True}, message="Term deleted successfully.")

