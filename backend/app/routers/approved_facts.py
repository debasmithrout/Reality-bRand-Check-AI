from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_editor
from app.core.errors import NotFoundException
from app.database.connection import get_db
from app.models.approved_fact import ApprovedFact
from app.models.profile import Profile
from app.schemas.approved_fact import (
    ApprovedFactCreate,
    ApprovedFactResponse,
    ApprovedFactUpdate,
)
from app.schemas.common import APIResponse
from app.services.brand_service import BrandService

router = APIRouter(tags=["Approved Facts"])


@router.post("/brands/{brand_id}/facts", response_model=APIResponse[ApprovedFactResponse], status_code=status.HTTP_201_CREATED)
def create_approved_fact(
    brand_id: str,
    payload: ApprovedFactCreate,
    current_user: Profile = Depends(require_editor),
    db: Session = Depends(get_db),
):
    """
    Register an approved fact / claim with verified evidence for a brand.
    """
    BrandService.get_accessible_brand(db, brand_id, current_user)

    fact = ApprovedFact(
        brand_id=brand_id,
        claim=payload.claim,
        evidence=payload.evidence,
        source=payload.source,
        approval_status=payload.approval_status or "APPROVED",
        tags=payload.tags,
    )
    db.add(fact)
    db.commit()
    db.refresh(fact)

    return APIResponse(data=ApprovedFactResponse.model_validate(fact), message="Approved fact registered successfully.")


@router.get("/brands/{brand_id}/facts", response_model=APIResponse[List[ApprovedFactResponse]])
def list_brand_facts(
    brand_id: str,
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status: APPROVED, PENDING_REVIEW, DEPRECATED"),
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List all verified facts and claims for a brand.
    """
    BrandService.get_accessible_brand(db, brand_id, current_user)

    query = db.query(ApprovedFact).filter(ApprovedFact.brand_id == brand_id)
    if status_filter:
        query = query.filter(ApprovedFact.approval_status == status_filter.upper())

    facts = query.order_by(ApprovedFact.created_at.desc()).all()
    data = [ApprovedFactResponse.model_validate(f) for f in facts]
    return APIResponse(data=data)


@router.patch("/facts/{fact_id}", response_model=APIResponse[ApprovedFactResponse])
def update_approved_fact(
    fact_id: str,
    payload: ApprovedFactUpdate,
    current_user: Profile = Depends(require_editor),
    db: Session = Depends(get_db),
):
    """
    Update an approved fact.
    """
    fact = db.query(ApprovedFact).filter(ApprovedFact.id == fact_id).first()
    if not fact:
        raise NotFoundException("ApprovedFact", fact_id)

    BrandService.get_accessible_brand(db, fact.brand_id, current_user)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(fact, field, value)

    db.commit()
    db.refresh(fact)
    return APIResponse(data=ApprovedFactResponse.model_validate(fact), message="Approved fact updated successfully.")


@router.delete("/facts/{fact_id}", response_model=APIResponse[dict])
def delete_approved_fact(
    fact_id: str,
    current_user: Profile = Depends(require_editor),
    db: Session = Depends(get_db),
):
    """
    Delete an approved fact.
    """
    fact = db.query(ApprovedFact).filter(ApprovedFact.id == fact_id).first()
    if not fact:
        raise NotFoundException("ApprovedFact", fact_id)

    BrandService.get_accessible_brand(db, fact.brand_id, current_user)

    db.delete(fact)
    db.commit()
    return APIResponse(data={"id": fact_id, "deleted": True}, message="Approved fact deleted successfully.")

