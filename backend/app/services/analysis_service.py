from typing import Any, Dict, List
from sqlalchemy.orm import Session

from app.ai.integration import AIEngineAdapter
from app.core.errors import AIServiceException
from app.models.approved_fact import ApprovedFact
from app.models.brand import Brand
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
            brand = db.query(Brand).filter(Brand.id == submission.brand_id).first()
            brand_name = brand.name if brand else None
            industry = brand.industry if brand else None

            guideline = db.query(Guideline).filter(Guideline.brand_id == submission.brand_id).first()
            personality = guideline.brand_personality if guideline else None
            tone = guideline.tone_of_voice if guideline else None

            additional_rules: List[str] = []
            if guideline:
                if guideline.messaging_rules:
                    if isinstance(guideline.messaging_rules, list):
                        additional_rules.extend([str(r) for r in guideline.messaging_rules if r])
                    elif isinstance(guideline.messaging_rules, dict):
                        for k, v in guideline.messaging_rules.items():
                            additional_rules.append(f"{k}: {v}")
                    else:
                        additional_rules.append(str(guideline.messaging_rules))
                if guideline.additional_guidelines:
                    if isinstance(guideline.additional_guidelines, list):
                        additional_rules.extend([str(r) for r in guideline.additional_guidelines if r])
                    else:
                        additional_rules.append(str(guideline.additional_guidelines))

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
            approved_terms = [
                t.term for t in terms_records
                if (t.term_type or "").upper() == "PREFERRED" and t.term
            ]
            prohibited_terms = [
                t.term for t in terms_records
                if (t.term_type or "").upper() == "PROHIBITED" and t.term
            ]
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

            guidelines_dict: Dict[str, Any] = {
                "brand_name": brand_name,
                "industry": industry,
                "personality": personality,
                "tone": tone,
                "approved_terms": approved_terms,
                "prohibited_terms": prohibited_terms,
                "approved_product_names": [],
                "additional_rules": additional_rules,
                # Legacy keys for fallback and backward-compatibility
                "brand_personality": personality,
                "tone_of_voice": tone,
                "messaging_rules": guideline.messaging_rules if guideline else None,
                "additional_guidelines": guideline.additional_guidelines if guideline else None,
            }

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
            try:
                sub = db.query(Submission).filter(Submission.id == submission_id).first()
                if sub:
                    sub.status = "DRAFT"
                    db.commit()
            except Exception:
                pass
            if isinstance(e, AIServiceException):
                raise e
            raise AIServiceException(f"Analysis pipeline error: {str(e)}")

