import asyncio
import os
import re
from typing import Any, Dict, List, Optional
from app.core.config import settings
from app.core.errors import AIServiceException

# Salman's AI engine imports
try:
    from app.ai.analyzer import analyze_brand_content as external_analyze_brand_content  # type: ignore
    from app.ai.exceptions import AIEngineError as ExternalAIEngineError  # type: ignore
    from app.ai.gemini_client import GeminiClient, GeminiConfig  # type: ignore
    HAS_EXTERNAL_AI = True
except (ImportError, ModuleNotFoundError):
    HAS_EXTERNAL_AI = False
    external_analyze_brand_content = None
    GeminiClient = None  # type: ignore
    GeminiConfig = None  # type: ignore
    ExternalAIEngineError = Exception

# Strict Category Mapping
CATEGORY_MAPPING = {
    "BRAND_TONE": "TONE",
    "TONE": "TONE",
    "TERMINOLOGY": "TERMINOLOGY",
    "CLAIM_VERIFICATION": "CLAIM_VERIFICATION",
    "BRAND_CONSISTENCY": "BRAND_CONSISTENCY",
    "GRAMMAR": "GRAMMAR",
}

# Strict Severity Mapping
SEVERITY_MAPPING = {
    "CRITICAL": "CRITICAL",
    "HIGH": "WARNING",
    "WARNING": "WARNING",
    "MEDIUM": "WARNING",
    "LOW": "INFO",
    "INFO": "INFO",
}

# Strict Overall Status Mapping
OVERALL_STATUS_MAPPING = {
    "PASS": "COMPLIANT",
    "APPROVED": "COMPLIANT",
    "COMPLIANT": "COMPLIANT",
    "NEEDS_REVIEW": "FLAGGED",
    "FLAGGED": "FLAGGED",
    "FAIL": "NON_COMPLIANT",
    "VIOLATION": "NON_COMPLIANT",
    "NON_COMPLIANT": "NON_COMPLIANT",
}

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
    Handles sync/async dispatch, normalization, strict mapping, backward-compatible aliases,
    and transparent fallback heuristic analysis.
    """

    @classmethod
    async def analyze(
        cls,
        content: str,
        brand_guidelines: Dict[str, Any],
        approved_facts: List[Dict[str, Any]],
        terminology: Optional[List[Dict[str, Any]]] = None,
        *,
        _client: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """
        Executes brand compliance analysis on submitted marketing content.
        Transforms backend context into Salman's BrandGuidelines schema.
        Dispatches to Gemini when configured or _client is provided,
        or transparently runs deterministic heuristic fallback when unconfigured.
        """
        if not content or not content.strip():
            raise AIServiceException("Cannot analyze empty content.")

        # Transform backend context into BrandGuidelines schema
        context_guidelines = cls._transform_guidelines_context(brand_guidelines, terminology)

        # 1. Test hook: Explicit mock client injected
        if _client is not None and HAS_EXTERNAL_AI and external_analyze_brand_content is not None:
            try:
                result = await asyncio.to_thread(
                    external_analyze_brand_content,
                    content=content,
                    brand_guidelines=context_guidelines,
                    approved_facts=approved_facts,
                    _client=_client,
                )
                return cls._validate_and_normalize_result(result, engine="gemini")
            except ExternalAIEngineError as e:
                raise AIServiceException(f"AI Engine failure [{e.code}]: {e.message}")
            except Exception as e:
                if isinstance(e, AIServiceException):
                    raise e
                raise AIServiceException(f"Unexpected error during AI analysis: {str(e)}")

        # 2. Live Gemini execution when API key is configured
        gemini_key = os.getenv("GEMINI_API_KEY") if os.getenv("GEMINI_API_KEY") is not None else settings.GEMINI_API_KEY
        gemini_key = (gemini_key or "").strip()
        gemini_model = (os.getenv("GEMINI_MODEL") or settings.GEMINI_MODEL or "gemini-3.5-flash").strip()
        raw_timeout = os.getenv("GEMINI_TIMEOUT") if os.getenv("GEMINI_TIMEOUT") is not None else settings.GEMINI_TIMEOUT
        gemini_timeout = float(raw_timeout or 30.0)

        if HAS_EXTERNAL_AI and external_analyze_brand_content is not None and gemini_key:
            try:
                # Explicitly inject centralized configuration from Backend Settings
                client_to_use = GeminiClient(
                    api_key=gemini_key,
                    model=gemini_model,
                    timeout=gemini_timeout,
                )
                result = await asyncio.to_thread(
                    external_analyze_brand_content,
                    content=content,
                    brand_guidelines=context_guidelines,
                    approved_facts=approved_facts,
                    _client=client_to_use,
                )
                return cls._validate_and_normalize_result(result, engine="gemini")
            except ExternalAIEngineError as e:
                raise AIServiceException(f"AI Engine failure [{e.code}]: {e.message}")
            except Exception as e:
                if isinstance(e, AIServiceException):
                    raise e
                raise AIServiceException(f"Unexpected error during AI analysis: {str(e)}")

        # 3. Transparent Heuristic Fallback Engine when GEMINI_API_KEY is not configured
        return cls._run_fallback_analysis(content, context_guidelines, approved_facts, terminology or [])

    @classmethod
    def _transform_guidelines_context(
        cls,
        brand_guidelines: Dict[str, Any],
        terminology: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Transforms database/backend guideline dictionaries into the exact
        Pydantic BrandGuidelines schema expected by Salman's AI engine.
        """
        transformed: Dict[str, Any] = {**brand_guidelines}

        # 1. Brand Name
        if "brand_name" not in transformed or not transformed["brand_name"]:
            if "name" in transformed and transformed["name"]:
                transformed["brand_name"] = transformed["name"]
            elif "brand" in transformed and transformed["brand"]:
                transformed["brand_name"] = transformed["brand"]

        # 2. Industry
        if "industry" not in transformed or not transformed["industry"]:
            if "sector" in transformed and transformed["sector"]:
                transformed["industry"] = transformed["sector"]

        # 3. Personality
        if "personality" not in transformed or not transformed["personality"]:
            if "brand_personality" in transformed and transformed["brand_personality"]:
                transformed["personality"] = transformed["brand_personality"]

        # 4. Tone
        if "tone" not in transformed or not transformed["tone"]:
            if "tone_of_voice" in transformed and transformed["tone_of_voice"]:
                transformed["tone"] = transformed["tone_of_voice"]

        # 5. Additional Rules
        additional_rules = list(transformed.get("additional_rules") or [])
        if "messaging_rules" in transformed and transformed["messaging_rules"]:
            mr = transformed["messaging_rules"]
            if isinstance(mr, list):
                additional_rules.extend([str(r) for r in mr if r])
            elif isinstance(mr, dict):
                for k, v in mr.items():
                    additional_rules.append(f"{k}: {v}")
            else:
                additional_rules.append(str(mr))
        if "additional_guidelines" in transformed and transformed["additional_guidelines"]:
            ag = transformed["additional_guidelines"]
            if isinstance(ag, list):
                additional_rules.extend([str(r) for r in ag if r])
            else:
                additional_rules.append(str(ag))
        transformed["additional_rules"] = additional_rules

        # 6. Terminology transformation
        approved_terms = list(transformed.get("approved_terms") or [])
        prohibited_terms = list(transformed.get("prohibited_terms") or [])
        if terminology:
            for t in terminology:
                term = t.get("term")
                if not term:
                    continue
                t_type = (t.get("term_type") or "").upper()
                if t_type == "PREFERRED" and term not in approved_terms:
                    approved_terms.append(term)
                elif t_type == "PROHIBITED" and term not in prohibited_terms:
                    prohibited_terms.append(term)
        transformed["approved_terms"] = approved_terms
        transformed["prohibited_terms"] = prohibited_terms

        return transformed

    @staticmethod
    def _validate_and_normalize_result(raw_result: Any, engine: str = "gemini") -> Dict[str, Any]:
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

            # Severity mapping (Unknown values raise AIServiceException)
            raw_severity = f.get("severity")
            if raw_severity is not None and str(raw_severity).strip():
                raw_severity_str = str(raw_severity).upper().strip()
                if raw_severity_str not in SEVERITY_MAPPING:
                    raise AIServiceException(f"Unknown finding severity: '{raw_severity}'")
                mapped_severity = SEVERITY_MAPPING[raw_severity_str]
            else:
                mapped_severity = "WARNING"

            # Category mapping (Unknown values raise AIServiceException)
            raw_category = f.get("category")
            if raw_category is not None and str(raw_category).strip():
                raw_category_str = str(raw_category).upper().strip()
                if raw_category_str not in CATEGORY_MAPPING:
                    raise AIServiceException(f"Unknown finding category: '{raw_category}'")
                mapped_category = CATEGORY_MAPPING[raw_category_str]
            else:
                mapped_category = "BRAND_CONSISTENCY"

            # Canonical text & alias
            orig_text = f.get("original_text") or f.get("matched_text") or ""

            # Canonical rule & alias
            rule_ref = f.get("violated_guideline") or f.get("rule_reference")

            # Confidence: 0.0 to 1.0; if missing, strictly None (never 1.0)
            confidence = f.get("confidence")
            if confidence is not None:
                try:
                    confidence = max(0.0, min(1.0, float(confidence)))
                except (ValueError, TypeError):
                    confidence = None

            # Evidence: preserve as-is (None if missing)
            evidence = f.get("evidence")
            if evidence is not None and not isinstance(evidence, str):
                evidence = str(evidence)

            # Synthetic finding ID
            ai_fid = f.get("finding_id") or f.get("ai_finding_id")

            # Finding status from AI
            f_status = f.get("status") or f.get("finding_status") or "FLAGGED"

            normalized_findings.append({
                "ai_finding_id": str(ai_fid) if ai_fid else None,
                "category": mapped_category,
                "severity": mapped_severity,
                "original_text": orig_text,
                "matched_text": orig_text,
                "explanation": f.get("explanation", "Guideline deviation identified."),
                "suggestion": f.get("suggestion", "Review against approved brand standards."),
                "violated_guideline": rule_ref,
                "rule_reference": rule_ref,
                "evidence": evidence,
                "confidence": confidence,
                "finding_status": str(f_status).upper().strip() if f_status else None,
            })

        # 3. Compliance Score: Optional float (0.0 to 100.0)
        raw_score = raw_result.get("compliance_score")
        compliance_score: Optional[float] = None
        if raw_score is not None:
            try:
                compliance_score = max(0.0, min(100.0, float(raw_score)))
            except (ValueError, TypeError):
                compliance_score = None

        # 4. Strict Overall Status Mapping (Unknown value raises AIServiceException)
        raw_status = raw_result.get("overall_status")
        if raw_status is not None:
            raw_status_str = str(raw_status).upper().strip()
            if raw_status_str not in OVERALL_STATUS_MAPPING:
                raise AIServiceException(f"Unknown overall status: '{raw_status}'")
            overall_status = OVERALL_STATUS_MAPPING[raw_status_str]
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
            "engine": engine,
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
        Clearly tags output as [Heuristic Fallback Engine] to distinguish from Gemini analysis.
        """
        findings = []
        content_lower = content.lower()
        corrected_content = content
        finding_counter = 1

        # 1. Prohibited & Preferred Terminology from brand_guidelines and terminology records
        prohibited_terms = set(brand_guidelines.get("prohibited_terms") or [])
        approved_terms = set(brand_guidelines.get("approved_terms") or [])

        # Add terms from terminology list if passed
        term_map = {}
        for t in terminology:
            term = t.get("term")
            if not term:
                continue
            term_map[term.lower()] = t
            t_type = (t.get("term_type") or "").upper()
            if t_type == "PROHIBITED":
                prohibited_terms.add(term)
            elif t_type == "PREFERRED":
                approved_terms.add(term)

        # Check prohibited terms
        for term in sorted(prohibited_terms, key=len, reverse=True):
            if not term or not term.strip():
                continue
            pattern = re.escape(term.strip())
            match = re.search(r"\b" + pattern + r"\b", content, re.IGNORECASE)
            if match:
                matched_str = match.group(0)
                fid = f"F-{finding_counter:03d}"
                finding_counter += 1
                meta = term_map.get(term.lower(), {})
                replacement = meta.get("preferred_replacement")

                suggestion = f"Remove '{matched_str}'."
                if replacement:
                    suggestion = f"Replace '{matched_str}' with approved term '{replacement}'."
                    corrected_content = re.sub(
                        r"\b" + pattern + r"\b",
                        replacement,
                        corrected_content,
                        flags=re.IGNORECASE,
                    )

                findings.append({
                    "finding_id": fid,
                    "category": "TERMINOLOGY",
                    "severity": "CRITICAL",
                    "status": "VIOLATION",
                    "original_text": matched_str,
                    "explanation": f"The term '{matched_str}' is strictly prohibited by brand guidelines.",
                    "suggestion": suggestion,
                    "violated_guideline": f"Prohibited Terminology: '{term}'",
                    "evidence": f"Brand dictionary strictly prohibits usage of '{term}'.",
                    "confidence": 0.98,
                })

        # Check approved terms casing
        for term in approved_terms:
            canonical = term.strip()
            if not any(c.isupper() for c in canonical):
                continue
            pattern = re.escape(canonical)
            for m in re.finditer(r"\b" + pattern + r"\b", content, re.IGNORECASE):
                matched_str = m.group(0)
                if matched_str != canonical:
                    fid = f"F-{finding_counter:03d}"
                    finding_counter += 1
                    findings.append({
                        "finding_id": fid,
                        "category": "BRAND_CONSISTENCY",
                        "severity": "LOW",
                        "status": "VIOLATION",
                        "original_text": matched_str,
                        "explanation": f"Approved term '{matched_str}' does not match canonical casing '{canonical}'.",
                        "suggestion": canonical,
                        "violated_guideline": f"Approved Term Casing: '{canonical}'",
                        "evidence": None,
                        "confidence": 1.0,
                    })

        # 2. Tone Analysis
        tone_rules = brand_guidelines.get("tone") or brand_guidelines.get("tone_of_voice") or {}
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
                            "status": "FLAGGED",
                            "original_text": buzzword,
                            "explanation": "Content uses unsubstantiated superlative/hyperbole contrary to brand tone.",
                            "suggestion": "Temper claim to verifiable brand strengths.",
                            "violated_guideline": "Tone of Voice: Avoid Hyperbole",
                            "evidence": f"Guideline rule '{dont}' bans superlative puffery.",
                            "confidence": 0.85,
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
                "status": "UNSUPPORTED",
                "original_text": ", ".join(set(claim_patterns)),
                "explanation": "Specific quantitative claims detected without approved evidence on record for this brand.",
                "suggestion": "Attach approved facts with supporting evidence or verify claims in Brand Knowledge Hub.",
                "violated_guideline": "Fact Verification Policy",
                "evidence": None,
                "confidence": 0.80,
            })

        # Calculate score using deterministic policy
        score = calculate_deterministic_compliance_score(findings)

        # Derive overall_status
        has_critical = any(f["severity"] == "CRITICAL" for f in findings)
        if has_critical or score < 70.0:
            overall_status = "NON_COMPLIANT"
        elif len(findings) > 0:
            overall_status = "FLAGGED"
        else:
            overall_status = "COMPLIANT"

        summary = f"[Heuristic Fallback Engine] Analysis completed: overall status {overall_status} with compliance score {score:.1f}%."
        if findings:
            summary += f" Identified {len(findings)} brand governance item(s) requiring human review."
        else:
            summary += " No brand compliance violations identified."

        raw_fallback_payload = {
            "overall_status": overall_status,
            "compliance_score": score,
            "summary": summary,
            "corrected_content": corrected_content if findings else None,
            "findings": findings,
        }
        return cls._validate_and_normalize_result(raw_fallback_payload, engine="heuristic_fallback")
