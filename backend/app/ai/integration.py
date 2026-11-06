import asyncio
import re
from typing import Any, Dict, List, Optional
from app.core.errors import AIServiceException

# Salman's proposed contract import attempt
try:
    from app.ai.analyzer import analyze_brand_content as external_analyze_brand_content  # type: ignore
    from app.ai.exceptions import AIEngineError as ExternalAIEngineError  # type: ignore
    HAS_EXTERNAL_AI = True
except ImportError:
    HAS_EXTERNAL_AI = False
    external_analyze_brand_content = None
    ExternalAIEngineError = Exception

# Transparent, agreed severity mapping with Salman
SEVERITY_MAPPING = {
    "CRITICAL": "CRITICAL",
    "HIGH": "WARNING",
    "WARNING": "WARNING",
    "MEDIUM": "WARNING",
    "INFO": "INFO",
    "LOW": "INFO",
}

# Allowed overall status values
ALLOWED_OVERALL_STATUS = {"COMPLIANT", "FLAGGED", "NON_COMPLIANT"}


def calculate_deterministic_compliance_score(findings: List[Dict[str, Any]]) -> float:
    """
    Explicit Deterministic Compliance Scoring Policy (Agreed with AI Engine):
    - Base score: 100.0
    - Each CRITICAL finding: -25.0
    - Each WARNING / HIGH / MEDIUM finding: -10.0
    - Each INFO / LOW finding: -0.0
    - Minimum score floor: 0.0, Maximum ceiling: 100.0
    """
    score = 100.0
    for f in findings:
        sev = (f.get("severity") or "WARNING").upper()
        mapped_sev = SEVERITY_MAPPING.get(sev, "WARNING")
        if mapped_sev == "CRITICAL":
            score -= 25.0
        elif mapped_sev == "WARNING":
            score -= 10.0
        elif mapped_sev == "INFO":
            score -= 0.0
    return max(0.0, min(100.0, score))


class AIEngineAdapter:
    """
    Adapter layer decoupling backend submission workflow from AI engine internals.
    Handles sync/async dispatch, normalization, backward-compatible aliases,
    and fallback heuristic analysis.
    """

    @classmethod
    async def analyze(
        cls,
        content: str,
        brand_guidelines: Dict[str, Any],
        approved_facts: List[Dict[str, Any]],
        terminology: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Executes brand compliance analysis on submitted marketing content.
        """
        if not content or not content.strip():
            raise AIServiceException("Cannot analyze empty content.")

        # If Salman's module is present, dispatch via threadpool
        if HAS_EXTERNAL_AI and external_analyze_brand_content is not None:
            try:
                context_guidelines = {**brand_guidelines}
                if terminology:
                    context_guidelines["terminology"] = terminology

                result = await asyncio.to_thread(
                    external_analyze_brand_content,
                    content=content,
                    brand_guidelines=context_guidelines,
                    approved_facts=approved_facts,
                )
                return cls._validate_and_normalize_result(result)
            except ExternalAIEngineError as e:
                raise AIServiceException(f"AI Engine failure: {str(e)}")
            except Exception as e:
                raise AIServiceException(f"Unexpected error during AI analysis: {str(e)}")

        # Heuristic fallback engine (runs seamlessly in development until Salman's module merges)
        return cls._run_fallback_analysis(content, brand_guidelines, approved_facts, terminology or [])

    @staticmethod
    def _validate_and_normalize_result(raw_result: Any) -> Dict[str, Any]:
        if not isinstance(raw_result, dict):
            raise AIServiceException("AI engine returned invalid non-dictionary response.")

        # 1. Summary: Required
        summary = raw_result.get("summary")
        if not summary or not isinstance(summary, str):
            summary = "Brand compliance analysis completed."

        # 2. Findings: Required
        raw_findings = raw_result.get("findings", [])
        if not isinstance(raw_findings, list):
            raw_findings = []

        normalized_findings = []
        for f in raw_findings:
            if not isinstance(f, dict):
                continue

            # Severity mapping
            raw_severity = str(f.get("severity", "WARNING")).upper()
            mapped_severity = SEVERITY_MAPPING.get(raw_severity, "WARNING")

            # Canonical text & alias
            orig_text = f.get("original_text") or f.get("matched_text") or ""

            # Canonical rule & alias
            rule_ref = f.get("violated_guideline") or f.get("rule_reference")

            # Confidence: 0.0 to 1.0; if missing, use None (never 1.0)
            confidence = f.get("confidence")
            if confidence is not None:
                try:
                    confidence = max(0.0, min(1.0, float(confidence)))
                except (ValueError, TypeError):
                    confidence = None

            # Evidence: preserve as-is (None if missing, distinct from contradictory evidence)
            evidence = f.get("evidence")
            if evidence is not None and not isinstance(evidence, str):
                evidence = str(evidence)

            # Synthetic finding ID
            ai_fid = f.get("finding_id") or f.get("ai_finding_id")

            # Finding status from AI
            f_status = f.get("status") or f.get("finding_status") or "FLAGGED"

            normalized_findings.append({
                "ai_finding_id": str(ai_fid) if ai_fid else None,
                "category": f.get("category", "BRAND_CONSISTENCY").upper(),
                "severity": mapped_severity,
                "original_text": orig_text,
                "matched_text": orig_text,
                "explanation": f.get("explanation", "Guideline deviation identified."),
                "suggestion": f.get("suggestion", "Review against approved brand standards."),
                "violated_guideline": rule_ref,
                "rule_reference": rule_ref,
                "evidence": evidence,
                "confidence": confidence,
                "finding_status": f_status,
            })

        # 3. Compliance Score: Optional float (0.0 to 100.0)
        raw_score = raw_result.get("compliance_score")
        compliance_score: Optional[float] = None
        if raw_score is not None:
            try:
                compliance_score = max(0.0, min(100.0, float(raw_score)))
            except (ValueError, TypeError):
                compliance_score = None

        # 4. Overall Status: COMPLIANT, FLAGGED, NON_COMPLIANT
        raw_status = raw_result.get("overall_status")
        if raw_status and isinstance(raw_status, str):
            candidate_status = raw_status.upper().strip()
            if candidate_status in ALLOWED_OVERALL_STATUS:
                overall_status = candidate_status
            elif candidate_status in ("PASS", "APPROVED"):
                overall_status = "COMPLIANT"
            elif candidate_status in ("FAIL", "VIOLATION"):
                overall_status = "NON_COMPLIANT"
            else:
                overall_status = "FLAGGED"
        else:
            # Deterministic status derivation when AI omits overall_status
            has_critical = any(f["severity"] == "CRITICAL" for f in normalized_findings)
            if has_critical or (compliance_score is not None and compliance_score < 70.0):
                overall_status = "NON_COMPLIANT"
            elif len(normalized_findings) > 0:
                overall_status = "FLAGGED"
            else:
                overall_status = "COMPLIANT"

        # 5. Corrected Content: Optional full revised copy
        corrected_content = raw_result.get("corrected_content")
        if corrected_content is not None and not isinstance(corrected_content, str):
            corrected_content = str(corrected_content)

        return {
            "overall_status": overall_status,
            "compliance_score": compliance_score,
            "summary": summary,
            "corrected_content": corrected_content,
            "findings": normalized_findings,
        }

    @classmethod
    def _run_fallback_analysis(
        cls,
        content: str,
        brand_guidelines: Dict[str, Any],
        approved_facts: List[Dict[str, Any]],
        terminology: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Deterministic heuristic fallback engine.
        Employs regex matching for terminology, tone checks, and unverified quantitative claims.
        """
        findings = []
        content_lower = content.lower()
        corrected_content = content

        finding_counter = 1

        # 1. Terminology Analysis
        for term_data in terminology:
            term = term_data.get("term", "")
            if not term:
                continue
            term_type = term_data.get("term_type", "").upper()
            is_case_sensitive = term_data.get("is_case_sensitive", False)
            replacement = term_data.get("preferred_replacement")

            pattern = re.escape(term)
            flags = 0 if is_case_sensitive else re.IGNORECASE
            match = re.search(r"\b" + pattern + r"\b", content, flags)

            if match:
                matched_str = match.group(0)
                fid = f"F-{finding_counter:03d}"
                finding_counter += 1

                if term_type == "PROHIBITED":
                    suggestion = f"Remove '{matched_str}'."
                    if replacement:
                        suggestion = f"Replace '{matched_str}' with approved term '{replacement}'."
                        corrected_content = re.sub(
                            r"\b" + pattern + r"\b",
                            replacement,
                            corrected_content,
                            flags=flags,
                        )

                    findings.append({
                        "finding_id": fid,
                        "category": "TERMINOLOGY",
                        "severity": "CRITICAL",
                        "original_text": matched_str,
                        "explanation": f"The term '{matched_str}' is strictly prohibited by brand guidelines. {term_data.get('description', '')}".strip(),
                        "suggestion": suggestion,
                        "violated_guideline": f"Prohibited Terminology: '{term}'",
                        "evidence": f"Brand dictionary strictly prohibits usage of '{term}'.",
                        "confidence": 0.98,
                        "status": "FLAGGED",
                    })
                elif term_type == "PREFERRED" and replacement:
                    corrected_content = re.sub(
                        r"\b" + pattern + r"\b",
                        replacement,
                        corrected_content,
                        flags=flags,
                    )
                    findings.append({
                        "finding_id": fid,
                        "category": "TERMINOLOGY",
                        "severity": "WARNING",
                        "original_text": matched_str,
                        "explanation": f"Brand guidelines prefer '{replacement}' over '{matched_str}'.",
                        "suggestion": f"Use '{replacement}' instead.",
                        "violated_guideline": f"Preferred Terminology: '{term}'",
                        "evidence": f"Brand dictionary designates '{replacement}' as preferred vocabulary.",
                        "confidence": 0.90,
                        "status": "FLAGGED",
                    })

        # 2. Tone Analysis
        tone_rules = brand_guidelines.get("tone_of_voice") or {}
        donts = []
        if isinstance(tone_rules, dict):
            donts = tone_rules.get("donts") or tone_rules.get("avoid") or []
        elif isinstance(tone_rules, list):
            donts = [item for item in tone_rules if "avoid" in str(item).lower() or "don't" in str(item).lower()]

        for dont in donts:
            dont_str = str(dont).lower()
            if "hyperbole" in dont_str or "unsubstantiated" in dont_str:
                for buzzword in ["best in the world", "100% foolproof", "unmatched miracles", "guaranteed wealth"]:
                    if buzzword in content_lower:
                        fid = f"F-{finding_counter:03d}"
                        finding_counter += 1
                        findings.append({
                            "finding_id": fid,
                            "category": "TONE",
                            "severity": "WARNING",
                            "original_text": buzzword,
                            "explanation": "Content uses unsubstantiated superlative/hyperbole contrary to brand tone.",
                            "suggestion": "Temper claim to verifiable brand strengths.",
                            "violated_guideline": "Tone of Voice: Avoid Hyperbole",
                            "evidence": f"Guideline rule '{dont}' bans superlative puffery.",
                            "confidence": 0.85,
                            "status": "FLAGGED",
                        })

        # 3. Claim Verification
        claim_patterns = re.findall(r"(\b\d+%\b|\b\d+x\b|\b#1\b)", content)
        if claim_patterns and not approved_facts:
            fid = f"F-{finding_counter:03d}"
            finding_counter += 1
            findings.append({
                "finding_id": fid,
                "category": "CLAIM_VERIFICATION",
                "severity": "WARNING",
                "original_text": ", ".join(set(claim_patterns)),
                "explanation": "Specific quantitative claims detected without approved evidence on record for this brand.",
                "suggestion": "Attach approved facts with supporting evidence or verify claims in Brand Knowledge Hub.",
                "violated_guideline": "Fact Verification Policy",
                "evidence": None,  # Missing evidence on record (distinguishable from contradictory evidence)
                "confidence": 0.80,
                "status": "FLAGGED",
            })

        # Calculate score using explicit deterministic policy
        score = calculate_deterministic_compliance_score(findings)

        # Derive overall_status
        has_critical = any(f["severity"] == "CRITICAL" for f in findings)
        if has_critical or score < 70.0:
            overall_status = "NON_COMPLIANT"
        elif len(findings) > 0:
            overall_status = "FLAGGED"
        else:
            overall_status = "COMPLIANT"

        summary = f"Analysis completed: overall status {overall_status} with compliance score {score:.1f}%."
        if findings:
            summary += f" Identified {len(findings)} brand governance item(s) requiring human review."
        else:
            summary += " No brand compliance violations identified."

        # Pass through the standard normalizer
        raw_fallback_payload = {
            "overall_status": overall_status,
            "compliance_score": score,
            "summary": summary,
            "corrected_content": corrected_content if findings else None,
            "findings": findings,
        }
        return cls._validate_and_normalize_result(raw_fallback_payload)
