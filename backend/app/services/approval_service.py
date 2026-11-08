from sqlalchemy.orm import Session

from app.core.errors import ForbiddenException, ValidationException
from app.models.approval import Approval
from app.models.profile import Profile
from app.models.submission import Submission
from app.schemas.approval import ApprovalCreate
from app.services.submission_service import SubmissionService


class ApprovalService:
    @staticmethod
    def process_review_decision(
        db: Session,
        submission_id: str,
        payload: ApprovalCreate,
        current_user: Profile,
    ) -> Approval:
        submission = SubmissionService.get_accessible_submission(db, submission_id, current_user)

        # Enforce review authorization: REVIEWER or ADMIN
        if current_user.role not in ["ADMIN", "REVIEWER"]:
            raise ForbiddenException("Only users with REVIEWER or ADMIN role can approve or reject submissions.")

        # Prevent self-approval if author is the reviewer, unless they are ADMIN
        if submission.submitted_by == current_user.id and current_user.role != "ADMIN":
            raise ForbiddenException("Self-approval is prohibited. Another reviewer must approve this submission.")

        # Require a mandatory rejection reason when rejecting
        if payload.decision == "REJECTED":
            if not payload.comments or not payload.comments.strip():
                raise ValidationException("A rejection reason/comment is mandatory when rejecting a submission.")

        # Map decision to submission state transition
        if payload.decision == "APPROVED":
            SubmissionService.transition_state(submission, "APPROVED")
        elif payload.decision == "REJECTED":
            SubmissionService.transition_state(submission, "REJECTED")
        elif payload.decision == "CHANGES_REQUESTED":
            SubmissionService.transition_state(submission, "DRAFT")

        approval = Approval(
            submission_id=submission.id,
            reviewer_id=current_user.id,
            decision=payload.decision,
            comments=payload.comments,
        )
        db.add(approval)
        db.commit()
        db.refresh(approval)
        return approval

