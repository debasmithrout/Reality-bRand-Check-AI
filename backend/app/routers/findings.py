from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_editor
from app.core.errors import NotFoundException
from app.database.connection import get_db
from app.models.finding import Finding
from app.models.profile import Profile
from app.schemas.common import APIResponse
from app.schemas.finding import FindingResponse, FindingUpdate
from app.services.submission_service import SubmissionService

router = APIRouter(tags=["Findings"])


@router.get("/submissions/{submission_id}/findings", response_model=APIResponse[List[FindingResponse]])
def get_submission_findings(
    submission_id: str,
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve all AI brand governance findings for a given submission.
    """
    SubmissionService.get_accessible_submission(db, submission_id, current_user)
    findings = (
        db.query(Finding)
        .filter(Finding.submission_id == submission_id)
        .order_by(Finding.created_at.asc())
        .all()
    )
    data = [FindingResponse.model_validate(f) for f in findings]
    return APIResponse(data=data)


@router.patch("/findings/{finding_id}", response_model=APIResponse[FindingResponse])
def update_finding_status(
    finding_id: str,
    payload: FindingUpdate,
    current_user: Profile = Depends(require_editor),
    db: Session = Depends(get_db),
):
    """
    Update finding state (e.g. mark resolved).
    """
    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        raise NotFoundException("Finding", finding_id)

    # Verify workspace access
    SubmissionService.get_accessible_submission(db, finding.submission_id, current_user)

    if payload.is_resolved is not None:
        finding.is_resolved = payload.is_resolved

    db.commit()
    db.refresh(finding)
    return APIResponse(data=FindingResponse.model_validate(finding), message="Finding updated.")

