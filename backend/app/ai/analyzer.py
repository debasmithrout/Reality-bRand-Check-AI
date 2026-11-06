"""
Reality bRand Check AI - AI Analysis Engine Orchestrator

Main analysis engine module implementing the brand content evaluation pipeline:
1. Input validation and normalization
2. Fast deterministic rule checks (prohibited terms, brand/product casing)
3. Gemini semantic analysis (brand tone, claim verification against ground truth)
4. Strict ground-truth verification and hallucination safeguards
5. Finding aggregation and overall status computation
6. Meaningful corrected content generation
7. Output validation and schema adherence
"""

import re
from typing import Any, Dict, List, Optional, Set, Tuple
from pydantic import ValidationError

from .exceptions import (
    AIEngineError,
    AI_API_ERROR,
    AI_INVALID_RESPONSE,
    AI_VALIDATION_ERROR,
)
from .gemini_client import GeminiClient
from .prompts import build_analysis_prompt
from .rule_checker import apply_deterministic_corrections, run_deterministic_checks
from .schemas import (
    AnalysisInput,
    AnalysisResponse,
    ApprovedFact,
    BrandGuidelines,
    Finding,
    FindingCategory,
    FindingStatus,
    OverallStatus,
    Severity,
)
from .validators import validate_analysis_input, validate_analysis_output


def _aggregate_overall_status(findings: List[Finding]) -> OverallStatus:
    """
    Determine the overall brand content status based on findings.

    Rules:
    - FAIL: Any CRITICAL or HIGH severity finding, or any CONTRADICTED status.
    - NEEDS_REVIEW: Any MEDIUM or LOW severity finding, or UNSUPPORTED / NEEDS_REVIEW status.
    - PASS: No findings, or only INFO severity / SUPPORTED status findings.
    """
    if not findings:
        return OverallStatus.PASS

    for f in findings:
        sev_val = f.severity.value if hasattr(f.severity, "value") else str(f.severity)
        stat_val = f.status.value if hasattr(f.status, "value") else str(f.status)
        # Critical or High severity, or explicit contradiction triggers FAIL
        if sev_val in (Severity.CRITICAL.value, Severity.HIGH.value):
            return OverallStatus.FAIL
        if stat_val == FindingStatus.CONTRADICTED.value:
            return OverallStatus.FAIL

    for f in findings:
        sev_val = f.severity.value if hasattr(f.severity, "value") else str(f.severity)
        stat_val = f.status.value if hasattr(f.status, "value") else str(f.status)
        # Medium / Low severity, or unverified claims trigger NEEDS_REVIEW
        if sev_val in (Severity.MEDIUM.value, Severity.LOW.value):
            return OverallStatus.NEEDS_REVIEW
        if stat_val in (
            FindingStatus.UNSUPPORTED.value,
            FindingStatus.NEEDS_REVIEW.value,
            FindingStatus.VIOLATION.value,
        ):
            return OverallStatus.NEEDS_REVIEW

    return OverallStatus.PASS


def _safeguard_claim_findings(
    findings: List[Finding],
    approved_facts: List[ApprovedFact],
) -> List[Finding]:
    """
    Apply strict anti-hallucination and claim-verification rules:
    1. If approved_facts is empty:
       - Neither SUPPORTED nor CONTRADICTED claims can remain in those states.
       - Demote to UNSUPPORTED with clear explanation.
       - Strip any fabricated evidence.
    2. If approved_facts is non-empty:
       - Require the provider to identify which approved fact supports or conflicts with the claim.
       - A claim can be SUPPORTED only when an existing approved fact genuinely supports it,
         evidenced by grounded citation in f.evidence.
       - A claim can be CONTRADICTED only when an existing approved fact explicitly conflicts with it,
         evidenced by grounded citation in f.evidence.
       - Where the relationship is unclear or the evidence does not establish grounding with the
         approved fact, safely demote the finding to NEEDS_REVIEW.
       - Strip fabricated fact references from evidence for all claim findings.

    Remaining semantic-verification limitation:
    Deterministic Python cannot prove full natural language semantic entailment. Grounding
    checks verify structural fact citation and substantive lexical correspondence with
    the approved fact, but complex semantic nuances remain bounded by model reasoning.
    Where deterministic grounding cannot be established reliably, findings are demoted to
    NEEDS_REVIEW.
    """
    facts_by_id: Dict[str, ApprovedFact] = {fact.id: fact for fact in approved_facts}
    valid_fact_ids: Set[str] = set(facts_by_id.keys())
    safeguarded: List[Finding] = []

    # Common structural words to exclude from grounding token sets
    stopwords = {"that", "with", "from", "this", "have", "were", "been", "will", "product", "claim", "fact", "true", "also"}

    for f in findings:
        cat_val = f.category.value if hasattr(f.category, "value") else str(f.category)
        stat_val = f.status.value if hasattr(f.status, "value") else str(f.status)

        if cat_val == FindingCategory.CLAIM_VERIFICATION.value:
            # Case 1: Empty approved facts - cannot be SUPPORTED or CONTRADICTED
            if not approved_facts:
                if stat_val in (FindingStatus.SUPPORTED.value, FindingStatus.CONTRADICTED.value):
                    f = Finding(
                        finding_id=f.finding_id,
                        category=f.category,
                        severity=Severity.MEDIUM,
                        status=FindingStatus.UNSUPPORTED,
                        original_text=f.original_text,
                        explanation=(
                            f"Claim '{f.original_text}' cannot be verified as {stat_val} "
                            f"because no approved ground truth facts were provided."
                        ),
                        violated_guideline=f.violated_guideline,
                        evidence=None,
                        suggestion="Verify this claim against verified ground truth documentation before publishing.",
                        confidence=f.confidence,
                    )
                elif f.evidence:
                    # Strip any fabricated evidence when no facts exist
                    f = Finding(
                        finding_id=f.finding_id,
                        category=f.category,
                        severity=f.severity,
                        status=f.status,
                        original_text=f.original_text,
                        explanation=f.explanation,
                        violated_guideline=f.violated_guideline,
                        evidence=None,
                        suggestion=f.suggestion,
                        confidence=f.confidence,
                    )

            # Case 2: Approved facts exist - verify citations and grounding via structured evidence
            else:
                cited_fact_ids = [
                    fact_id for fact_id in valid_fact_ids
                    if re.search(rf"\b{re.escape(fact_id)}\b", f.evidence or "")
                ]

                if stat_val == FindingStatus.SUPPORTED.value:
                    if not cited_fact_ids:
                        # Demote to UNSUPPORTED if evidence does not cite a valid approved fact
                        f = Finding(
                            finding_id=f.finding_id,
                            category=f.category,
                            severity=Severity.LOW,
                            status=FindingStatus.UNSUPPORTED,
                            original_text=f.original_text,
                            explanation=(
                                f"Claim '{f.original_text}' lacks structured evidence referencing "
                                f"a valid approved ground truth fact."
                            ),
                            violated_guideline=f.violated_guideline,
                            evidence=None,
                            suggestion=f.suggestion or "Provide approved ground truth documentation.",
                            confidence=f.confidence,
                        )
                    else:
                        ref_fact = facts_by_id[cited_fact_ids[0]]
                        ref_text = f"{ref_fact.claim} {ref_fact.evidence or ''}".lower()
                        ref_tokens = set(re.findall(r"\b[a-zA-Z0-9_-]{3,}\b", ref_text)) - stopwords
                        ev_text = (f.evidence or "").lower()
                        ev_tokens = set(re.findall(r"\b[a-zA-Z0-9_-]{3,}\b", ev_text)) - {cited_fact_ids[0].lower()}

                        # Grounding verification: check if evidence reflects substantive details of the approved fact
                        is_grounded = bool(ref_tokens.intersection(ev_tokens)) if ref_tokens else True
                        if not is_grounded:
                            # Demote to NEEDS_REVIEW: relationship is unclear or evidence does not establish support
                            f = Finding(
                                finding_id=f.finding_id,
                                category=f.category,
                                severity=Severity.MEDIUM,
                                status=FindingStatus.NEEDS_REVIEW,
                                original_text=f.original_text,
                                explanation=(
                                    f"Claim '{f.original_text}' cites approved fact '{ref_fact.id}', but the evidence provided "
                                    f"does not clearly substantiate support against the approved ground truth claim: \"{ref_fact.claim}\"."
                                ),
                                violated_guideline=f.violated_guideline,
                                evidence=f.evidence,
                                suggestion=f.suggestion or f"Verify claim directly against approved fact '{ref_fact.id}'.",
                                confidence=f.confidence,
                            )

                elif stat_val == FindingStatus.CONTRADICTED.value:
                    if not cited_fact_ids:
                        # Demote to NEEDS_REVIEW because explicit conflicting evidence from approved facts is missing
                        f = Finding(
                            finding_id=f.finding_id,
                            category=f.category,
                            severity=Severity.MEDIUM,
                            status=FindingStatus.NEEDS_REVIEW,
                            original_text=f.original_text,
                            explanation=(
                                f"Claim '{f.original_text}' lacks structured evidence citing "
                                f"an approved ground truth fact to establish explicit contradiction."
                            ),
                            violated_guideline=f.violated_guideline,
                            evidence=None,
                            suggestion=f.suggestion or "Verify against approved ground truth documentation.",
                            confidence=f.confidence,
                        )
                    else:
                        ref_fact = facts_by_id[cited_fact_ids[0]]
                        ref_text = f"{ref_fact.claim} {ref_fact.evidence or ''}".lower()
                        ref_tokens = set(re.findall(r"\b[a-zA-Z0-9_-]{3,}\b", ref_text)) - stopwords
                        ev_text = (f.evidence or "").lower()
                        ev_tokens = set(re.findall(r"\b[a-zA-Z0-9_-]{3,}\b", ev_text)) - {cited_fact_ids[0].lower()}

                        is_grounded = bool(ref_tokens.intersection(ev_tokens)) if ref_tokens else True
                        if not is_grounded:
                            f = Finding(
                                finding_id=f.finding_id,
                                category=f.category,
                                severity=Severity.MEDIUM,
                                status=FindingStatus.NEEDS_REVIEW,
                                original_text=f.original_text,
                                explanation=(
                                    f"Claim '{f.original_text}' cites approved fact '{ref_fact.id}', but the evidence provided "
                                    f"does not clearly establish explicit contradiction against: \"{ref_fact.claim}\"."
                                ),
                                violated_guideline=f.violated_guideline,
                                evidence=f.evidence,
                                suggestion=f.suggestion or "Verify conflict against approved ground truth documentation.",
                                confidence=f.confidence,
                            )

                else:
                    # For UNSUPPORTED, NEEDS_REVIEW, VIOLATION:
                    # Strip invalid/fabricated fact citations from evidence
                    if f.evidence and not cited_fact_ids:
                        f = Finding(
                            finding_id=f.finding_id,
                            category=f.category,
                            severity=f.severity,
                            status=f.status,
                            original_text=f.original_text,
                            explanation=f.explanation,
                            violated_guideline=f.violated_guideline,
                            evidence=None,
                            suggestion=f.suggestion,
                            confidence=f.confidence,
                        )

        safeguarded.append(f)

    return safeguarded


def _merge_findings(
    deterministic_findings: List[Finding],
    semantic_findings_raw: List[Dict[str, Any]],
    approved_facts: List[ApprovedFact],
) -> List[Finding]:
    """
    Merge deterministic and semantic findings, eliminating duplicates and
    enforcing consistent sequential finding IDs.
    Normalizes internal whitespace in deduplication keys to prevent duplicate
    findings with varying spacing or newlines.
    """
    merged: List[Finding] = []
    # Track findings by normalized text and category to prevent duplicates
    seen_keys: Set[Tuple[str, str]] = set()

    for df in deterministic_findings:
        cat_val = df.category.value if hasattr(df.category, "value") else str(df.category)
        normalized_text = " ".join(df.original_text.split()).lower()
        key = (normalized_text, cat_val)
        seen_keys.add(key)
        merged.append(df)

    # Convert and filter semantic findings
    for sf_dict in semantic_findings_raw:
        try:
            sf = Finding.model_validate(sf_dict)
        except ValidationError:
            continue

        cat_val = sf.category.value if hasattr(sf.category, "value") else str(sf.category)
        normalized_text = " ".join(sf.original_text.split()).lower()
        key = (normalized_text, cat_val)
        # Prevent both deterministic/semantic duplicates and duplicate semantic findings
        if key in seen_keys:
            continue
        seen_keys.add(key)
        merged.append(sf)

    # Apply strict claim-verification ground truth safeguards
    safeguarded = _safeguard_claim_findings(merged, approved_facts)

    # Re-index finding IDs sequentially
    final_findings: List[Finding] = []
    for idx, f in enumerate(safeguarded, start=1):
        updated_finding = Finding(
            finding_id=f"finding-{idx}",
            category=f.category,
            severity=f.severity,
            status=f.status,
            original_text=f.original_text,
            explanation=f.explanation,
            violated_guideline=f.violated_guideline,
            evidence=f.evidence,
            suggestion=f.suggestion,
            confidence=f.confidence,
        )
        final_findings.append(updated_finding)

    return final_findings


def _generate_corrected_content(
    original_content: str,
    brand_guidelines: BrandGuidelines,
    findings: List[Finding],
    gemini_corrected: Optional[str],
) -> Optional[str]:
    """
    Generate meaningful corrected content when violations or issues exist.
    Returns None if content is completely clean without findings.
    """
    if not findings:
        return None

    # Use Gemini's semantic corrected content as base if provided, else original
    base_text = gemini_corrected.strip() if (gemini_corrected and gemini_corrected.strip()) else original_content

    # Apply high-precision deterministic corrections strictly to text of detected findings
    corrected = apply_deterministic_corrections(base_text, brand_guidelines, findings)

    return corrected if corrected else None


def analyze_brand_content(
    content: str,
    brand_guidelines: dict,
    approved_facts: list,
    *,
    _client: Optional[GeminiClient] = None,
) -> dict:
    """
    Public entry point for analyzing marketing and brand content.

    Synchronous, decoupled AI Engine analyzer that performs:
    1. Input validation & normalization
    2. Deterministic rule checking (prohibited terminology, casing)
    3. Gemini semantic analysis (tone, ground truth claim verification)
    4. Safe claim verification & anti-hallucination enforcement
    5. Overall status aggregation & actionable findings generation
    6. Corrected content synthesis
    7. Output validation adhering to AnalysisResponse schema

    Args:
        content: The text content to analyze (must be non-empty string).
        brand_guidelines: Dictionary of brand guidelines (normalized to BrandGuidelines).
        approved_facts: List of approved ground truth facts (normalized to List[ApprovedFact]).
        _client: Internal test-hook for injecting a mocked GeminiClient.

    Returns:
        dict: Validated JSON-compatible dictionary adhering to AnalysisResponse contract.

    Raises:
        AIEngineError: On validation errors, configuration issues, timeouts, or API failures.
    """
    # 1. Validate and normalize inputs
    validated_input: AnalysisInput = validate_analysis_input(
        content=content,
        brand_guidelines=brand_guidelines,
        approved_facts=approved_facts,
    )

    # 2. Run fast deterministic checks
    deterministic_findings: List[Finding] = run_deterministic_checks(
        content=validated_input.content,
        brand_guidelines=validated_input.brand_guidelines,
    )

    # 3. Perform semantic analysis via Gemini
    client = _client if _client is not None else GeminiClient()

    prompt = build_analysis_prompt(
        content=validated_input.content,
        brand_guidelines=validated_input.brand_guidelines,
        approved_facts=validated_input.approved_facts,
    )

    gemini_result = client.generate_content(prompt=prompt)

    # 4. Merge findings and apply ground truth safeguards
    semantic_findings_raw = gemini_result.get("findings", [])
    merged_findings = _merge_findings(
        deterministic_findings=deterministic_findings,
        semantic_findings_raw=semantic_findings_raw,
        approved_facts=validated_input.approved_facts,
    )

    # 5. Aggregate overall status deterministically
    overall_status = _aggregate_overall_status(merged_findings)

    # 6. Generate corrected content
    corrected_content = _generate_corrected_content(
        original_content=validated_input.content,
        brand_guidelines=validated_input.brand_guidelines,
        findings=merged_findings,
        gemini_corrected=gemini_result.get("corrected_content"),
    )

    # 7. Build summary
    gemini_summary = gemini_result.get("summary", "").strip()
    if not gemini_summary:
        if overall_status == OverallStatus.PASS:
            summary = "Brand content passed all guideline and claim verification checks."
        elif overall_status == OverallStatus.FAIL:
            summary = f"Brand content failed verification with {len(merged_findings)} finding(s)."
        else:
            summary = f"Brand content requires review with {len(merged_findings)} finding(s)."
    else:
        summary = gemini_summary

    response_dict = {
        "overall_status": overall_status.value,
        "summary": summary,
        "findings": [f.model_dump(mode="json") for f in merged_findings],
        "corrected_content": corrected_content,
    }

    # 8. Final output validation
    return validate_analysis_output(response_dict)
