from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.connection import get_db
from app.models.brand import Brand
from app.models.finding import Finding
from app.models.profile import Profile
from app.models.submission import Submission
from app.schemas.common import APIResponse
from app.schemas.dashboard import ComplianceMetrics, DashboardSummaryResponse
from app.schemas.submission import SubmissionResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=APIResponse[DashboardSummaryResponse])
def get_dashboard_summary(
    current_user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve governance dashboard statistics, compliance scores, and recent submissions for the workspace.
    """
    sub_query = db.query(Submission)
    brand_query = db.query(Brand)
    finding_query = db.query(Finding).join(Submission, Finding.submission_id == Submission.id)

    if current_user.role != "ADMIN":
        sub_query = sub_query.filter(Submission.workspace_id == current_user.workspace_id)
        brand_query = brand_query.filter(Brand.workspace_id == current_user.workspace_id)
        finding_query = finding_query.filter(Submission.workspace_id == current_user.workspace_id)

    total_submissions = sub_query.count()
    pending_reviews = sub_query.filter(Submission.status == "NEEDS_REVIEW").count()
    approved_submissions = sub_query.filter(Submission.status == "APPROVED").count()
    rejected_submissions = sub_query.filter(Submission.status == "REJECTED").count()

    # Calculate average compliance score for analyzed submissions
    scored_submissions = sub_query.filter(Submission.compliance_score.isnot(None)).all()
    avg_score = 0.0
    if scored_submissions:
        avg_score = round(
            sum(s.compliance_score for s in scored_submissions) / len(scored_submissions),
            1,
        )

    total_findings = finding_query.count()
    critical_findings = finding_query.filter(Finding.severity == "CRITICAL").count()
    active_brands_count = brand_query.filter(Brand.is_active == True).count()

    recent_submissions_records = (
        sub_query.order_by(Submission.created_at.desc()).limit(5).all()
    )
    recent_submissions = [
        SubmissionResponse.model_validate(s) for s in recent_submissions_records
    ]

    metrics = ComplianceMetrics(
        average_compliance_score=avg_score,
        total_submissions=total_submissions,
        pending_reviews=pending_reviews,
        approved_submissions=approved_submissions,
        rejected_submissions=rejected_submissions,
        total_findings=total_findings,
        critical_findings=critical_findings,
    )

    summary_data = DashboardSummaryResponse(
        metrics=metrics,
        recent_submissions=recent_submissions,
        active_brands_count=active_brands_count,
    )

    return APIResponse(data=summary_data)

