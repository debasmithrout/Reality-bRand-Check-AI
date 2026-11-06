from typing import List, Optional
from sqlalchemy.orm import Session

from app.core.errors import ForbiddenException, NotFoundException, StateTransitionException
from app.models.brand import Brand
from app.models.profile import Profile
from app.models.revision import Revision
from app.models.submission import Submission
from app.schemas.submission import RevisionCreate, SubmissionCreate, SubmissionUpdate
from app.services.brand_service import BrandService

# Allowed lifecycle states
ALLOWED_STATES = {"DRAFT", "SUBMITTED", "ANALYZING", "NEEDS_REVIEW", "APPROVED", "REJECTED"}

VALID_TRANSITIONS = {
    "DRAFT": {"SUBMITTED", "ANALYZING"},
    "SUBMITTED": {"ANALYZING", "DRAFT"},
    "ANALYZING": {"NEEDS_REVIEW", "APPROVED", "REJECTED"},
    "NEEDS_REVIEW": {"ANALYZING", "APPROVED", "REJECTED", "DRAFT"},
    "APPROVED": {"DRAFT"},  # Re-editing an approved submission resets to draft
    "REJECTED": {"DRAFT", "ANALYZING"},
}


class SubmissionService:
    @staticmethod
    def get_accessible_submission(db: Session, submission_id: str, current_user: Profile) -> Submission:
        submission = db.query(Submission).filter(Submission.id == submission_id).first()
        if not submission:
            raise NotFoundException("Submission", submission_id)

        if current_user.role != "ADMIN" and submission.workspace_id != current_user.workspace_id:
            raise ForbiddenException("You do not have access to this submission's workspace.")

        return submission

    @staticmethod
    def list_submissions(
        db: Session,
        current_user: Profile,
        brand_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[Submission]:
        query = db.query(Submission)
        if current_user.role != "ADMIN":
            query = query.filter(Submission.workspace_id == current_user.workspace_id)

        if brand_id:
            query = query.filter(Submission.brand_id == brand_id)
        if status:
            query = query.filter(Submission.status == status.upper())

        return query.order_by(Submission.created_at.desc()).all()

    @staticmethod
    def create_submission(db: Session, payload: SubmissionCreate, current_user: Profile) -> Submission:
        # Verify brand access
        brand = BrandService.get_accessible_brand(db, payload.brand_id, current_user)

        submission = Submission(
            brand_id=brand.id,
            workspace_id=current_user.workspace_id,
            title=payload.title,
            content=payload.content,
            channel=payload.channel,
            status="DRAFT",
            submitted_by=current_user.id,
        )
        db.add(submission)
        db.commit()
        db.refresh(submission)

        # Create initial revision v1
        rev = Revision(
            submission_id=submission.id,
            version=1,
            content=payload.content,
            changes_summary="Initial submission draft",
            created_by=current_user.id,
        )
        db.add(rev)
        db.commit()

        return submission

    @staticmethod
    def update_submission(
        db: Session,
        submission_id: str,
        payload: SubmissionUpdate,
        current_user: Profile,
    ) -> Submission:
        submission = SubmissionService.get_accessible_submission(db, submission_id, current_user)

        # Only author or editor/admin can update content
        if current_user.role not in ["ADMIN", "EDITOR"] and submission.submitted_by != current_user.id:
            raise ForbiddenException("You do not have permission to edit this submission.")

        update_data = payload.model_dump(exclude_unset=True)
        content_changed = "content" in update_data and update_data["content"] != submission.content

        for field, value in update_data.items():
            setattr(submission, field, value)

        if content_changed:
            # When content changes, transition back to DRAFT or SUBMITTED
            submission.status = "DRAFT"
            submission.compliance_score = None

            # Add new revision version
            latest_rev = (
                db.query(Revision)
                .filter(Revision.submission_id == submission.id)
                .order_by(Revision.version.desc())
                .first()
            )
            next_version = (latest_rev.version + 1) if latest_rev else 1

            rev = Revision(
                submission_id=submission.id,
                version=next_version,
                content=submission.content,
                changes_summary="Content edited",
                created_by=current_user.id,
            )
            db.add(rev)

        db.commit()
        db.refresh(submission)
        return submission

    @staticmethod
    def create_revision(
        db: Session,
        submission_id: str,
        payload: RevisionCreate,
        current_user: Profile,
    ) -> Revision:
        submission = SubmissionService.get_accessible_submission(db, submission_id, current_user)

        latest_rev = (
            db.query(Revision)
            .filter(Revision.submission_id == submission.id)
            .order_by(Revision.version.desc())
            .first()
        )
        next_version = (latest_rev.version + 1) if latest_rev else 1

        submission.content = payload.content
        submission.status = "DRAFT"
        submission.compliance_score = None

        rev = Revision(
            submission_id=submission.id,
            version=next_version,
            content=payload.content,
            changes_summary=payload.changes_summary or f"Revision v{next_version}",
            created_by=current_user.id,
        )
        db.add(rev)
        db.commit()
        db.refresh(rev)
        return rev

    @staticmethod
    def list_revisions(db: Session, submission_id: str, current_user: Profile) -> List[Revision]:
        SubmissionService.get_accessible_submission(db, submission_id, current_user)
        return (
            db.query(Revision)
            .filter(Revision.submission_id == submission_id)
            .order_by(Revision.version.desc())
            .all()
        )

    @staticmethod
    def transition_state(submission: Submission, new_status: str) -> None:
        new_status = new_status.upper()
        if new_status not in ALLOWED_STATES:
            raise StateTransitionException(f"Invalid status '{new_status}'.")

        allowed = VALID_TRANSITIONS.get(submission.status, set())
        if new_status not in allowed:
            raise StateTransitionException(
                f"Cannot transition submission from '{submission.status}' to '{new_status}'."
            )
        submission.status = new_status

