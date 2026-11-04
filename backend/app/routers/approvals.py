from typing import Optional
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import require_reviewer
from app.database.connection import get_db
from app.models.profile import Profile
from app.schemas.approval import ApprovalCreate, ApprovalResponse
from app.schemas.common import APIResponse
from app.services.approval_service import ApprovalService

router = APIRouter(tags=["Approvals"])


class DecisionRequest(BaseModel):
    comments: Optional[str] = None


@router.post(
    "/submissions/{submission_id}/approve",
    response_model=APIResponse[ApprovalResponse],
    status_code=status.HTTP_200_OK,
)
def approve_submission(
    submission_id: str,
    payload: Optional[DecisionRequest] = None,
    current_user: Profile = Depends(require_reviewer),
    db: Session = Depends(get_db),
):
    """
    Approve marketing copy for publication after review.
    """
    comments = payload.comments if payload else None
    approval = ApprovalService.process_review_decision(
        db=db,
        submission_id=submission_id,
        payload=ApprovalCreate(decision="APPROVED", comments=comments),
        current_user=current_user,
    )
    return APIResponse(
        data=ApprovalResponse.model_validate(approval),
        message="Submission approved successfully.",
    )


@router.post(
    "/submissions/{submission_id}/reject",
    response_model=APIResponse[ApprovalResponse],
    status_code=status.HTTP_200_OK,
)
def reject_submission(
    submission_id: str,
    payload: Optional[DecisionRequest] = None,
    current_user: Profile = Depends(require_reviewer),
    db: Session = Depends(get_db),
):
    """
    Reject marketing copy due to brand compliance failures.
    """
    comments = payload.comments if payload else None
    approval = ApprovalService.process_review_decision(
        db=db,
        submission_id=submission_id,
        payload=ApprovalCreate(decision="REJECTED", comments=comments),
        current_user=current_user,
    )
    return APIResponse(
        data=ApprovalResponse.model_validate(approval),
        message="Submission rejected.",
    )

