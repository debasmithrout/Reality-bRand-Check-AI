from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_editor
from app.database.connection import get_db
from app.models.profile import Profile
from app.schemas.common import APIResponse
from app.schemas.submission import (
    AnalyzeRequest,
    RevisionCreate,
    RevisionResponse,
    SubmissionCreate,
    SubmissionDetailResponse,
    SubmissionResponse,
    SubmissionUpdate,
)
from app.services.analysis_service import AnalysisService
from app.services.submission_service import SubmissionService

router = APIRouter(prefix="/submissions", tags=["Submissions"])


@router.post("", response_model=APIResponse[SubmissionResponse], status_code=status.HTTP_201_CREATED)
def create_submission(
    payload: SubmissionCreate,
    current_user: Profile = Depends(require_editor),
    db: Session = Depends(get_db),
):
    """
    Create a new marketing copy submission for brand compliance review.
    """
    submission = SubmissionService.create_submission(db, payload, current_user)
    return APIResponse(
        data=SubmissionResponse.model_validate(submission),
        message="Submission created successfully.",
    )


@router.get("", response_model=APIResponse[List[SubmissionResponse]])
def list_submissions(
    brand_id: Optional[str] = Query(None, description="Filter by brand ID"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by submission status"),
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List submissions within the user's workspace.
    """
    submissions = SubmissionService.list_submissions(
        db, current_user, brand_id=brand_id, status=status_filter
    )
    data = [SubmissionResponse.model_validate(s) for s in submissions]
    return APIResponse(data=data)


@router.get("/{submission_id}", response_model=APIResponse[SubmissionDetailResponse])
def get_submission(
    submission_id: str,
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve submission details, including AI findings, revisions, and approval history.
    """
    submission = SubmissionService.get_accessible_submission(db, submission_id, current_user)
    return APIResponse(data=SubmissionDetailResponse.model_validate(submission))


@router.patch("/{submission_id}", response_model=APIResponse[SubmissionResponse])
def update_submission(
    submission_id: str,
    payload: SubmissionUpdate,
    current_user: Profile = Depends(require_editor),
    db: Session = Depends(get_db),
):
    """
    Update submission content or metadata. Automatically tracks a revision if content is altered.
    """
    submission = SubmissionService.update_submission(db, submission_id, payload, current_user)
    return APIResponse(
        data=SubmissionResponse.model_validate(submission),
        message="Submission updated successfully.",
    )


@router.post("/{submission_id}/analyze", response_model=APIResponse[SubmissionDetailResponse])
async def analyze_submission(
    submission_id: str,
    current_user: Profile = Depends(require_editor),
    db: Session = Depends(get_db),
):
    """
    Trigger AI brand compliance analysis against brand guidelines, terminology, and approved claims.
    """
    submission = await AnalysisService.run_analysis(db, submission_id, current_user)
    return APIResponse(
        data=SubmissionDetailResponse.model_validate(submission),
        message="Analysis completed successfully.",
    )


@router.post("/{submission_id}/revisions", response_model=APIResponse[RevisionResponse], status_code=status.HTTP_201_CREATED)
def create_revision(
    submission_id: str,
    payload: RevisionCreate,
    current_user: Profile = Depends(require_editor),
    db: Session = Depends(get_db),
):
    """
    Record an explicit content revision for a submission.
    """
    rev = SubmissionService.create_revision(db, submission_id, payload, current_user)
    return APIResponse(
        data=RevisionResponse.model_validate(rev),
        message="Revision saved successfully.",
    )


@router.get("/{submission_id}/revisions", response_model=APIResponse[List[RevisionResponse]])
def list_revisions(
    submission_id: str,
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List all revision history for a submission.
    """
    revisions = SubmissionService.list_revisions(db, submission_id, current_user)
    data = [RevisionResponse.model_validate(r) for r in revisions]
    return APIResponse(data=data)

