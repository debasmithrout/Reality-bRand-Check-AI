from typing import Any, Dict, List
from sqlalchemy.orm import Session

from app.ai.integration import AIEngineAdapter
from app.core.errors import AIServiceException
from app.models.approved_fact import ApprovedFact
from app.models.finding import Finding
from app.models.guideline import Guideline
from app.models.profile import Profile
from app.models.submission import Submission
from app.models.terminology import Terminology
from app.services.submission_service import SubmissionService


class AnalysisService:
    @staticmethod
    async def run_analysis(
        db: Session,
        submission_id: str,
        current_user: Profile,
    ) -> Submission:
        submission = SubmissionService.get_accessible_submission(db, submission_id, current_user)

        # Transition status to ANALYZING
        SubmissionService.transition_state(submission, "ANALYZING")
        db.commit()
        db.refresh(submission)

        try:
            # 1. Gather brand guidelines context
            guideline = db.query(Guideline).filter(Guideline.brand_id == submission.brand_id).first()
            guidelines_dict: Dict[str, Any] = {}
            if guideline:
                guidelines_dict = {
                    "brand_personality": guideline.brand_personality,
                    "tone_of_voice": guideline.tone_of_voice,
                    "messaging_rules": guideline.messaging_rules,
                    "additional_guidelines": guideline.additional_guidelines,
                }

            # 2. Gather approved facts
            approved_facts_records = (
                db.query(ApprovedFact)
                .filter(
                    ApprovedFact.brand_id == submission.brand_id,
                    ApprovedFact.approval_status == "APPROVED",
                )
                .all()
            )
            approved_facts_list = [
                {
                    "id": f.id,
                    "claim": f.claim,
                    "evidence": f.evidence,
                    "source": f.source,
                    "tags": f.tags,
                }
                for f in approved_facts_records
            ]

            # 3. Gather terminology
            terms_records = db.query(Terminology).filter(Terminology.brand_id == submission.brand_id).all()
            terminology_list = [
                {
                    "id": t.id,
                    "term": t.term,
                    "term_type": t.term_type,
                    "preferred_replacement": t.preferred_replacement,
                    "description": t.description,
                    "is_case_sensitive": t.is_case_sensitive,
                }
                for t in terms_records
            ]

            # 4. Invoke AI Engine via Adapter
            analysis_result = await AIEngineAdapter.analyze(
                content=submission.content,
                brand_guidelines=guidelines_dict,
                approved_facts=approved_facts_list,
                terminology=terminology_list,
            )

            # 5. Clear previous findings for this submission
            db.query(Finding).filter(Finding.submission_id == submission.id).delete()

            # 6. Persist new findings with canonical and alias fields
            for f_data in analysis_result.get("findings", []):
                orig_text = f_data.get("original_text") or f_data.get("matched_text") or ""
                violated_rule = f_data.get("violated_guideline") or f_data.get("rule_reference")

                finding = Finding(
                    submission_id=submission.id,
                    ai_finding_id=f_data.get("ai_finding_id"),
                    category=f_data.get("category", "BRAND_CONSISTENCY"),
                    severity=f_data.get("severity", "WARNING"),
                    original_text=orig_text,
                    matched_text=orig_text,
                    explanation=f_data.get("explanation", ""),
                    suggestion=f_data.get("suggestion", ""),
                    violated_guideline=violated_rule,
                    rule_reference=violated_rule,
                    evidence=f_data.get("evidence"),
                    confidence=f_data.get("confidence"),
                    finding_status=f_data.get("finding_status", "FLAGGED"),
                    is_resolved=False,
                )
                db.add(finding)

            # 7. Update submission metrics and advance state
            submission.compliance_score = analysis_result.get("compliance_score")
            submission.overall_status = analysis_result.get("overall_status")
            submission.summary = analysis_result.get("summary")
            submission.corrected_content = analysis_result.get("corrected_content")

            # Crucial: COMPLIANT must never auto-approve; submission always requires human review
            SubmissionService.transition_state(submission, "NEEDS_REVIEW")

            db.commit()
            db.refresh(submission)
            return submission

        except Exception as e:
            # On failure, roll back to DRAFT or SUBMITTED so user can retry
            db.rollback()
            submission.status = "DRAFT"
            db.commit()
            if isinstance(e, AIServiceException):
                raise e
            raise AIServiceException(f"Analysis pipeline error: {str(e)}")

