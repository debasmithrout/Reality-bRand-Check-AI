"""
Reality bRand Check AI - Comprehensive Unit Tests & Regressions for AI Analysis Engine

Tests all 14 required capabilities + 10 specific regression scenarios with 100% mocked dependencies:
1. Approved terminology handling
2. Prohibited terminology detection
3. Missing optional guideline fields
4. Brand tone mismatch detection
5. Supported claims verification against ground truth
6. Unsupported claims detection
7. Contradicted claims handling
8. Empty approved facts handling & anti-hallucination safeguard
9. Brand-name casing inconsistency detection
10. Approved product-name casing inconsistency detection
11. Gemini timeout error handling
12. Gemini malformed response error handling
13. Overall status aggregation rules
14. Corrected content generation

Regression Test Suite:
- Reg 1: Empty approved facts + Gemini returns CONTRADICTED
- Reg 2: Empty approved facts + Gemini returns SUPPORTED
- Reg 3: Existing but unrelated / non-matching fact ID
- Reg 4: Fact ID mentioned negatively in explanation
- Reg 5: Duplicate semantic findings deduplication
- Reg 6: Prohibited multi-word phrase separated by newline
- Reg 7: Prohibited phrase separated by multiple spaces
- Reg 8: Exact public function signature verification
- Reg 9: Corrections must not modify unrelated common words
- Reg 10: Contradicted claim with explicit conflicting approved evidence
"""

import inspect
from unittest.mock import MagicMock, patch
import pytest

from app.ai.analyzer import analyze_brand_content
from app.ai.exceptions import (
    AIEngineError,
    AI_INVALID_RESPONSE,
    AI_TIMEOUT,
    AI_VALIDATION_ERROR,
)
from app.ai.gemini_client import GeminiClient
from app.ai.schemas import (
    FindingCategory,
    FindingStatus,
    OverallStatus,
    Severity,
)


def _make_mock_client(return_response=None, side_effect=None):
    """Helper to create a mocked GeminiClient."""
    mock_client = MagicMock(spec=GeminiClient)
    if side_effect:
        mock_client.generate_content.side_effect = side_effect
    else:
        default_resp = {
            "overall_status": "PASS",
            "summary": "Content complies with guidelines.",
            "findings": [],
            "corrected_content": None,
        }
        mock_client.generate_content.return_value = return_response or default_resp
    return mock_client


class TestAIAnalysisEngine:
    """Core capabilities test suite for analyze_brand_content."""

    def test_1_approved_terms_handling(self):
        """Content conforming to approved terminology passes cleanly."""
        content = "Our sustainable and eco-friendly products are designed for durability."
        guidelines = {
            "brand_name": "EcoBrand",
            "approved_terms": ["sustainable", "eco-friendly"],
            "prohibited_terms": ["cheap", "disposable"],
        }
        client = _make_mock_client({
            "overall_status": "PASS",
            "summary": "All terminology is compliant.",
            "findings": [],
            "corrected_content": None,
        })

        result = analyze_brand_content(content, guidelines, approved_facts=[], _client=client)

        assert result["overall_status"] == "PASS"
        assert len(result["findings"]) == 0
        assert result["corrected_content"] is None
        client.generate_content.assert_called_once()

    def test_2_prohibited_terms_detected(self):
        """Prohibited terms are caught deterministically as HIGH severity violations."""
        content = "Our cheap product is a bargain."
        guidelines = {
            "prohibited_terms": ["cheap", "bargain"],
        }
        client = _make_mock_client()

        result = analyze_brand_content(content, guidelines, approved_facts=[], _client=client)

        assert result["overall_status"] == "FAIL"
        term_findings = [f for f in result["findings"] if f["category"] == FindingCategory.TERMINOLOGY.value]
        assert len(term_findings) == 2
        assert any(f["original_text"] == "cheap" for f in term_findings)
        assert any(f["original_text"] == "bargain" for f in term_findings)
        assert all(f["severity"] == Severity.HIGH.value for f in term_findings)
        assert all(f["status"] == FindingStatus.VIOLATION.value for f in term_findings)

    def test_3_missing_optional_guideline_fields(self):
        """Missing or empty guideline fields are handled gracefully without errors."""
        content = "Standard product announcement."
        client = _make_mock_client()

        # None guidelines and None facts
        result = analyze_brand_content(content, brand_guidelines={}, approved_facts=[], _client=client)
        assert result["overall_status"] == "PASS"

    def test_4_brand_tone_mismatch(self):
        """Tone divergence is identified and categorized under BRAND_TONE."""
        content = "Buy this garbage now or else!"
        guidelines = {
            "tone": ["professional", "courteous"],
            "personality": "helpful",
        }
        client = _make_mock_client({
            "overall_status": "NEEDS_REVIEW",
            "summary": "Content exhibits aggressive tone.",
            "findings": [
                {
                    "finding_id": "tone-1",
                    "category": FindingCategory.BRAND_TONE.value,
                    "severity": Severity.MEDIUM.value,
                    "status": FindingStatus.VIOLATION.value,
                    "original_text": "Buy this garbage now or else!",
                    "explanation": "Tone is aggressive and unprofessional, conflicting with courteous guidelines.",
                    "violated_guideline": "Tone: professional, courteous",
                    "evidence": None,
                    "suggestion": "We invite you to explore our latest offerings.",
                    "confidence": 0.95,
                }
            ],
            "corrected_content": "We invite you to explore our latest offerings.",
        })

        result = analyze_brand_content(content, guidelines, approved_facts=[], _client=client)

        assert result["overall_status"] == "NEEDS_REVIEW"
        tone_findings = [f for f in result["findings"] if f["category"] == FindingCategory.BRAND_TONE.value]
        assert len(tone_findings) == 1
        assert tone_findings[0]["suggestion"] == "We invite you to explore our latest offerings."

    def test_5_supported_claims(self):
        """Claims supported by approved facts are verified with cited fact ID in structured evidence."""
        content = "Our server delivers 99.99% uptime."
        facts = [
            {
                "id": "fact-uptime-01",
                "claim": "Our server delivers 99.99% uptime.",
                "evidence": "Q3 2025 SLA Audit Report",
            }
        ]
        client = _make_mock_client({
            "overall_status": "PASS",
            "summary": "Uptime claim supported by fact-uptime-01.",
            "findings": [
                {
                    "finding_id": "claim-1",
                    "category": FindingCategory.CLAIM_VERIFICATION.value,
                    "severity": Severity.INFO.value,
                    "status": FindingStatus.SUPPORTED.value,
                    "original_text": "Our server delivers 99.99% uptime.",
                    "explanation": "Substantiated by verified audit report in fact-uptime-01.",
                    "violated_guideline": None,
                    "evidence": "fact-uptime-01: Q3 2025 SLA Audit Report",
                    "suggestion": None,
                    "confidence": 0.98,
                }
            ],
            "corrected_content": None,
        })

        result = analyze_brand_content(content, brand_guidelines={}, approved_facts=facts, _client=client)

        assert result["overall_status"] == "PASS"
        claim_findings = [f for f in result["findings"] if f["category"] == FindingCategory.CLAIM_VERIFICATION.value]
        assert len(claim_findings) == 1
        assert claim_findings[0]["status"] == FindingStatus.SUPPORTED.value

    def test_6_unsupported_claims(self):
        """Claims lacking ground truth are marked UNSUPPORTED without fabricated evidence."""
        content = "Our battery charges from 0 to 100 in 3 minutes."
        facts = [
            {"id": "fact-1", "claim": "Our battery lasts 24 hours."}
        ]
        client = _make_mock_client({
            "overall_status": "NEEDS_REVIEW",
            "summary": "Rapid charging claim is unsupported.",
            "findings": [
                {
                    "finding_id": "claim-unsupp-1",
                    "category": FindingCategory.CLAIM_VERIFICATION.value,
                    "severity": Severity.MEDIUM.value,
                    "status": FindingStatus.UNSUPPORTED.value,
                    "original_text": "charges from 0 to 100 in 3 minutes",
                    "explanation": "No approved fact substantiates a 3-minute charging time.",
                    "violated_guideline": None,
                    "evidence": None,
                    "suggestion": "Remove rapid charge claim or obtain engineering benchmark verification.",
                    "confidence": 0.92,
                }
            ],
            "corrected_content": "Our battery lasts 24 hours.",
        })

        result = analyze_brand_content(content, brand_guidelines={}, approved_facts=facts, _client=client)

        assert result["overall_status"] == "NEEDS_REVIEW"
        claim_finding = result["findings"][0]
        assert claim_finding["status"] == FindingStatus.UNSUPPORTED.value
        assert claim_finding["evidence"] is None

    def test_7_contradicted_claims(self):
        """Claims contradicting approved facts are flagged CONTRADICTED causing FAIL."""
        content = "Our product contains 20g of added sugar."
        facts = [
            {
                "id": "fact-sugar-0",
                "claim": "Our product contains 0g of sugar and is completely sugar-free.",
                "evidence": "Nutritional Lab Analysis #891",
            }
        ]
        client = _make_mock_client({
            "overall_status": "FAIL",
            "summary": "Sugar claim contradicts nutritional lab analysis.",
            "findings": [
                {
                    "finding_id": "contra-1",
                    "category": FindingCategory.CLAIM_VERIFICATION.value,
                    "severity": Severity.HIGH.value,
                    "status": FindingStatus.CONTRADICTED.value,
                    "original_text": "contains 20g of added sugar",
                    "explanation": "Directly contradicts fact-sugar-0 stating 0g sugar.",
                    "violated_guideline": None,
                    "evidence": "fact-sugar-0: Nutritional Lab Analysis #891",
                    "suggestion": "Correct to sugar-free or 0g sugar.",
                    "confidence": 0.99,
                }
            ],
            "corrected_content": "Our product is sugar-free.",
        })

        result = analyze_brand_content(content, brand_guidelines={}, approved_facts=facts, _client=client)

        assert result["overall_status"] == "FAIL"
        contra_findings = [f for f in result["findings"] if f["status"] == FindingStatus.CONTRADICTED.value]
        assert len(contra_findings) == 1

    def test_8_empty_approved_facts(self):
        """When approved_facts is empty, any claimed fact is demoted from SUPPORTED to UNSUPPORTED."""
        content = "We have 10 million active users."
        client = _make_mock_client({
            "overall_status": "PASS",
            "summary": "Active users claim.",
            "findings": [
                {
                    "finding_id": "hallucinated-1",
                    "category": FindingCategory.CLAIM_VERIFICATION.value,
                    "severity": Severity.INFO.value,
                    "status": FindingStatus.SUPPORTED.value,
                    "original_text": "10 million active users",
                    "explanation": "User metric claim.",
                    "violated_guideline": None,
                    "evidence": "Invented report",
                    "suggestion": None,
                    "confidence": 0.8,
                }
            ],
            "corrected_content": None,
        })

        result = analyze_brand_content(content, brand_guidelines={}, approved_facts=[], _client=client)

        claim_finding = result["findings"][0]
        assert claim_finding["status"] == FindingStatus.UNSUPPORTED.value
        assert claim_finding["evidence"] is None
        assert result["overall_status"] == "NEEDS_REVIEW"

    def test_9_brand_name_casing_inconsistency(self):
        """Incorrect brand name capitalization is caught deterministically."""
        content = "Discover why acmecorp is leading the market."
        guidelines = {"brand_name": "AcmeCorp"}
        client = _make_mock_client()

        result = analyze_brand_content(content, guidelines, approved_facts=[], _client=client)

        brand_findings = [f for f in result["findings"] if f["category"] == FindingCategory.BRAND_CONSISTENCY.value]
        assert len(brand_findings) == 1
        assert brand_findings[0]["original_text"] == "acmecorp"
        assert brand_findings[0]["suggestion"] == "AcmeCorp"
        assert "AcmeCorp" in result["corrected_content"]

    def test_10_product_name_casing_inconsistency(self):
        """Incorrect approved product name capitalization is caught deterministically."""
        content = "Check out the new powerwidget v2."
        guidelines = {"approved_product_names": ["PowerWidget"]}
        client = _make_mock_client()

        result = analyze_brand_content(content, guidelines, approved_facts=[], _client=client)

        prod_findings = [f for f in result["findings"] if f["category"] == FindingCategory.BRAND_CONSISTENCY.value]
        assert len(prod_findings) == 1
        assert prod_findings[0]["original_text"] == "powerwidget"
        assert prod_findings[0]["suggestion"] == "PowerWidget"
        assert "PowerWidget" in result["corrected_content"]

    def test_11_gemini_timeout_handling(self):
        """Timeouts from the Gemini client are mapped and propagated as AI_TIMEOUT."""
        content = "Testing timeout error handling."
        client = _make_mock_client(
            side_effect=AIEngineError(code=AI_TIMEOUT, message="Gemini API request timed out.")
        )

        with pytest.raises(AIEngineError) as exc_info:
            analyze_brand_content(content, brand_guidelines={}, approved_facts=[], _client=client)

        assert exc_info.value.code == AI_TIMEOUT
        assert "timed out" in exc_info.value.message

    def test_12_gemini_malformed_response(self):
        """Malformed or non-JSON responses from Gemini are propagated as AI_INVALID_RESPONSE."""
        content = "Testing malformed output handling."
        client = _make_mock_client(
            side_effect=AIEngineError(code=AI_INVALID_RESPONSE, message="Malformed non-JSON output.")
        )

        with pytest.raises(AIEngineError) as exc_info:
            analyze_brand_content(content, brand_guidelines={}, approved_facts=[], _client=client)

        assert exc_info.value.code == AI_INVALID_RESPONSE

    def test_13_overall_status_aggregation(self):
        """Test status aggregation rules across PASS, NEEDS_REVIEW, and FAIL."""
        content = "Clean test content."

        # Case A: Only INFO findings -> PASS
        client_pass = _make_mock_client({
            "overall_status": "PASS",
            "summary": "Clean",
            "findings": [
                {
                    "finding_id": "f-info",
                    "category": FindingCategory.BRAND_TONE.value,
                    "severity": Severity.INFO.value,
                    "status": FindingStatus.SUPPORTED.value,
                    "original_text": "Clean",
                    "explanation": "Tone matches.",
                }
            ],
            "corrected_content": None,
        })
        res_pass = analyze_brand_content(content, {}, [], _client=client_pass)
        assert res_pass["overall_status"] == "PASS"

        # Case B: MEDIUM severity -> NEEDS_REVIEW
        client_review = _make_mock_client({
            "overall_status": "NEEDS_REVIEW",
            "summary": "Review",
            "findings": [
                {
                    "finding_id": "f-med",
                    "category": FindingCategory.BRAND_TONE.value,
                    "severity": Severity.MEDIUM.value,
                    "status": FindingStatus.NEEDS_REVIEW.value,
                    "original_text": "Clean",
                    "explanation": "Tone could be improved.",
                }
            ],
            "corrected_content": None,
        })
        res_review = analyze_brand_content(content, {}, [], _client=client_review)
        assert res_review["overall_status"] == "NEEDS_REVIEW"

        # Case C: CRITICAL severity -> FAIL
        client_fail = _make_mock_client({
            "overall_status": "FAIL",
            "summary": "Fail",
            "findings": [
                {
                    "finding_id": "f-crit",
                    "category": FindingCategory.TERMINOLOGY.value,
                    "severity": Severity.CRITICAL.value,
                    "status": FindingStatus.VIOLATION.value,
                    "original_text": "Clean",
                    "explanation": "Critical breach.",
                }
            ],
            "corrected_content": None,
        })
        res_fail = analyze_brand_content(content, {}, [], _client=client_fail)
        assert res_fail["overall_status"] == "FAIL"

    def test_14_corrected_content_generation(self):
        """Corrected content is synthesized with deterministic fixes when issues exist, None when clean."""
        # Clean content
        content_clean = "Clean brand text."
        client_clean = _make_mock_client({
            "overall_status": "PASS",
            "summary": "Clean",
            "findings": [],
            "corrected_content": None,
        })
        res_clean = analyze_brand_content(content_clean, {}, [], _client=client_clean)
        assert res_clean["corrected_content"] is None

        # Content with issues
        content_with_issues = "Welcome to acme for your superwidget needs."
        guidelines = {
            "brand_name": "ACME",
            "approved_product_names": ["SuperWidget"],
        }
        client_issues = _make_mock_client({
            "overall_status": "NEEDS_REVIEW",
            "summary": "Casing issues detected.",
            "findings": [],
            "corrected_content": "Welcome to ACME for your SuperWidget needs.",
        })
        res_issues = analyze_brand_content(content_with_issues, guidelines, [], _client=client_issues)
        assert res_issues["corrected_content"] == "Welcome to ACME for your SuperWidget needs."

    def test_invalid_input_rejected(self):
        """Invalid inputs raise AIEngineError with AI_VALIDATION_ERROR before Gemini is called."""
        client = _make_mock_client()

        with pytest.raises(AIEngineError) as exc:
            analyze_brand_content("", {}, [], _client=client)
        assert exc.value.code == AI_VALIDATION_ERROR

        with pytest.raises(AIEngineError) as exc:
            analyze_brand_content(12345, {}, [], _client=client)  # type: ignore
        assert exc.value.code == AI_VALIDATION_ERROR

        client.generate_content.assert_not_called()

    def test_invalid_final_output_structure(self):
        """If final output structure fails validation, AI_INVALID_RESPONSE is raised."""
        client = _make_mock_client()

        with patch("app.ai.analyzer.validate_analysis_output") as mock_val:
            mock_val.side_effect = AIEngineError(
                code=AI_INVALID_RESPONSE,
                message="Invalid analysis response structure: missing required field.",
            )
            with pytest.raises(AIEngineError) as exc_info:
                analyze_brand_content("Test content", {}, [], _client=client)

            assert exc_info.value.code == AI_INVALID_RESPONSE

    def test_default_client_instantiation_without_explicit_client(self, monkeypatch):
        """When _client is omitted, GeminiClient is instantiated using environment config."""
        monkeypatch.setenv("GEMINI_API_KEY", "test-mock-api-key")
        mock_instance = _make_mock_client()

        with patch("app.ai.analyzer.GeminiClient", return_value=mock_instance) as mock_cls:
            result = analyze_brand_content("Test content", {}, [])
            mock_cls.assert_called_once()
            assert result["overall_status"] == "PASS"


class TestMilestone3Regressions:
    """Targeted regression test suite addressing all Milestone 3 audit findings."""

    def test_reg_1_empty_facts_with_contradicted_gemini_response(self):
        """Empty approved facts must NOT allow Gemini to declare a claim CONTRADICTED."""
        content = "We guarantee 100% money back within 30 days."
        # Simulate Gemini returning CONTRADICTED despite zero facts supplied
        client = _make_mock_client({
            "overall_status": "FAIL",
            "summary": "Contradicts return policy.",
            "findings": [
                {
                    "finding_id": "contra-ghost-1",
                    "category": FindingCategory.CLAIM_VERIFICATION.value,
                    "severity": Severity.HIGH.value,
                    "status": FindingStatus.CONTRADICTED.value,
                    "original_text": "100% money back within 30 days",
                    "explanation": "Contradicts standard policy.",
                    "violated_guideline": None,
                    "evidence": "Invented ghost fact ID #999",
                    "suggestion": None,
                    "confidence": 0.85,
                }
            ],
            "corrected_content": None,
        })

        # approved_facts is explicitly empty
        result = analyze_brand_content(content, {}, approved_facts=[], _client=client)

        # Safeguard must demote CONTRADICTED to UNSUPPORTED and strip fabricated evidence
        finding = result["findings"][0]
        assert finding["status"] == FindingStatus.UNSUPPORTED.value
        assert finding["evidence"] is None
        # Overall status must not be FAIL when there is no genuine ground-truth contradiction
        assert result["overall_status"] == OverallStatus.NEEDS_REVIEW.value

    def test_reg_2_empty_facts_with_supported_gemini_response(self):
        """Empty approved facts must demote SUPPORTED claims to UNSUPPORTED and strip evidence."""
        content = "Our servers operate in 14 countries."
        client = _make_mock_client({
            "overall_status": "PASS",
            "summary": "Supported server count.",
            "findings": [
                {
                    "finding_id": "supp-ghost-1",
                    "category": FindingCategory.CLAIM_VERIFICATION.value,
                    "severity": Severity.INFO.value,
                    "status": FindingStatus.SUPPORTED.value,
                    "original_text": "operate in 14 countries",
                    "explanation": "Verified server locations.",
                    "evidence": "Invented geo document",
                    "confidence": 0.9,
                }
            ],
            "corrected_content": None,
        })

        result = analyze_brand_content(content, {}, approved_facts=[], _client=client)

        finding = result["findings"][0]
        assert finding["status"] == FindingStatus.UNSUPPORTED.value
        assert finding["evidence"] is None
        assert result["overall_status"] == OverallStatus.NEEDS_REVIEW.value

    def test_reg_3_existing_unrelated_fact_id(self):
        """Citing a fabricated or non-existent fact ID must cause claim demotion to UNSUPPORTED."""
        content = "Our product lasts for 50 years."
        facts = [{"id": "fact-real-1", "claim": "Our product lasts for 5 years."}]
        client = _make_mock_client({
            "overall_status": "PASS",
            "summary": "Product durability.",
            "findings": [
                {
                    "finding_id": "dur-1",
                    "category": FindingCategory.CLAIM_VERIFICATION.value,
                    "severity": Severity.INFO.value,
                    "status": FindingStatus.SUPPORTED.value,
                    "original_text": "lasts for 50 years",
                    "explanation": "Matches fact-fake-99.",
                    "evidence": "fact-fake-99: Unrelated 50 year warranty test",
                    "confidence": 0.9,
                }
            ],
            "corrected_content": None,
        })

        result = analyze_brand_content(content, {}, approved_facts=facts, _client=client)

        finding = result["findings"][0]
        # Since fact-fake-99 does not exist in facts, it must be demoted
        assert finding["status"] == FindingStatus.UNSUPPORTED.value
        assert finding["evidence"] is None

    def test_reg_4_fact_id_mentioned_negatively_in_explanation(self):
        """Mentioning a valid fact ID in explanation text must NOT count as proof."""
        content = "Our product is made from titanium alloy."
        facts = [{"id": "fact-titanium-1", "claim": "Frame is composed of aluminum 6061."}]
        # Gemini says SUPPORTED, but evidence is None, while explanation mentions fact-titanium-1 in negative context
        client = _make_mock_client({
            "overall_status": "PASS",
            "summary": "Titanium claim evaluation.",
            "findings": [
                {
                    "finding_id": "tit-1",
                    "category": FindingCategory.CLAIM_VERIFICATION.value,
                    "severity": Severity.INFO.value,
                    "status": FindingStatus.SUPPORTED.value,
                    "original_text": "made from titanium alloy",
                    "explanation": "This claim does not match fact-titanium-1 at all.",
                    "evidence": None,
                    "confidence": 0.5,
                }
            ],
            "corrected_content": None,
        })

        result = analyze_brand_content(content, {}, approved_facts=facts, _client=client)

        finding = result["findings"][0]
        # Substring in explanation must NOT make it SUPPORTED!
        assert finding["status"] == FindingStatus.UNSUPPORTED.value
        assert finding["evidence"] is None

    def test_reg_5_duplicate_semantic_findings(self):
        """Duplicate findings from Gemini for identical text and category must be deduplicated."""
        content = "Buy our product right now."
        client = _make_mock_client({
            "overall_status": "NEEDS_REVIEW",
            "summary": "Duplicate tone findings.",
            "findings": [
                {
                    "finding_id": "sem-1",
                    "category": FindingCategory.BRAND_TONE.value,
                    "severity": Severity.MEDIUM.value,
                    "status": FindingStatus.VIOLATION.value,
                    "original_text": "Buy our product right now",
                    "explanation": "Tone is overly aggressive.",
                },
                {
                    "finding_id": "sem-2",
                    "category": FindingCategory.BRAND_TONE.value,
                    "severity": Severity.MEDIUM.value,
                    "status": FindingStatus.VIOLATION.value,
                    "original_text": "Buy our product right now",
                    "explanation": "Tone is overly aggressive duplicate.",
                },
            ],
            "corrected_content": None,
        })

        result = analyze_brand_content(content, {}, [], _client=client)

        # Only 1 unique finding for that text and category must remain
        tone_findings = [f for f in result["findings"] if f["category"] == FindingCategory.BRAND_TONE.value]
        assert len(tone_findings) == 1

    def test_reg_6_prohibited_multi_word_phrase_newline(self):
        """Prohibited multi-word phrases separated by a newline character must be caught."""
        content = "We offer a guaranteed\nprofit on all investments."
        guidelines = {"prohibited_terms": ["guaranteed profit"]}
        client = _make_mock_client()

        result = analyze_brand_content(content, guidelines, [], _client=client)

        term_findings = [f for f in result["findings"] if f["category"] == FindingCategory.TERMINOLOGY.value]
        assert len(term_findings) == 1
        assert "guaranteed" in term_findings[0]["original_text"].lower()
        assert "profit" in term_findings[0]["original_text"].lower()
        assert result["overall_status"] == OverallStatus.FAIL.value

    def test_reg_7_prohibited_phrase_multiple_spaces(self):
        """Prohibited multi-word phrases separated by multiple spaces must be caught."""
        content = "This product is a   miracle   cure   for all illnesses."
        guidelines = {"prohibited_terms": ["miracle cure"]}
        client = _make_mock_client()

        result = analyze_brand_content(content, guidelines, [], _client=client)

        term_findings = [f for f in result["findings"] if f["category"] == FindingCategory.TERMINOLOGY.value]
        assert len(term_findings) == 1
        assert "miracle" in term_findings[0]["original_text"].lower()
        assert "cure" in term_findings[0]["original_text"].lower()
        assert result["overall_status"] == OverallStatus.FAIL.value

    def test_reg_8_exact_public_function_signature(self):
        """Verify the exact backend interface contract signature."""
        sig = inspect.signature(analyze_brand_content)
        params = list(sig.parameters.values())

        # Three positional/keyword parameters without defaults
        assert params[0].name == "content"
        assert params[1].name == "brand_guidelines"
        assert params[2].name == "approved_facts"

        # brand_guidelines and approved_facts have no defaults in signature
        assert params[0].default is inspect.Parameter.empty
        assert params[1].default is inspect.Parameter.empty
        assert params[2].default is inspect.Parameter.empty

        # _client is keyword-only test hook with default None
        assert params[3].name == "_client"
        assert params[3].kind == inspect.Parameter.KEYWORD_ONLY
        assert params[3].default is None

    def test_reg_9_corrections_do_not_modify_unrelated_common_words(self):
        """Corrections must NOT replace unrelated common words that were not flagged as brand violations."""
        # Brand name is ACME, and content has 'acme' plus common words 'next' and 'target'
        content = "Welcome to acme. The next target is Q4."
        guidelines = {
            "brand_name": "ACME",
        }
        client = _make_mock_client({
            "overall_status": "NEEDS_REVIEW",
            "summary": "Brand name casing issue.",
            "findings": [],
            "corrected_content": None,
        })

        result = analyze_brand_content(content, guidelines, [], _client=client)

        # 'acme' should be corrected to 'ACME', but unrelated words 'next' and 'target' must remain lowercase
        assert result["corrected_content"] == "Welcome to ACME. The next target is Q4."
        assert "next" in result["corrected_content"]
        assert "target" in result["corrected_content"]
        assert "Next" not in result["corrected_content"]
        assert "Target" not in result["corrected_content"]

    def test_reg_10_contradicted_claim_with_explicit_conflicting_approved_evidence(self):
        """A claim with explicit conflicting evidence citing a valid fact ID is confirmed CONTRADICTED."""
        content = "Our beverage contains 50g of refined cane sugar."
        facts = [
            {
                "id": "fact-sugar-zero",
                "claim": "Product contains 0g of sugar.",
                "evidence": "Certified Nutrition Label #A102",
            }
        ]
        client = _make_mock_client({
            "overall_status": "FAIL",
            "summary": "Sugar claim contradicts certified nutrition label.",
            "findings": [
                {
                    "finding_id": "sugar-contra",
                    "category": FindingCategory.CLAIM_VERIFICATION.value,
                    "severity": Severity.HIGH.value,
                    "status": FindingStatus.CONTRADICTED.value,
                    "original_text": "contains 50g of refined cane sugar",
                    "explanation": "Directly contradicts fact-sugar-zero stating 0g sugar.",
                    "evidence": "fact-sugar-zero: Certified Nutrition Label #A102 states 0g sugar.",
                    "confidence": 0.99,
                }
            ],
            "corrected_content": "Our beverage is sugar-free.",
        })

        result = analyze_brand_content(content, {}, approved_facts=facts, _client=client)

        assert result["overall_status"] == OverallStatus.FAIL.value
        finding = result["findings"][0]
        assert finding["status"] == FindingStatus.CONTRADICTED.value
        assert "fact-sugar-zero" in finding["evidence"]


class TestAdversarialAuditFixes:
    """Targeted regression suite for the second adversarial audit fixes."""

    # --------------------------------------------------------------------------
    # MAJOR-1: Approved terminology casing false positives
    # --------------------------------------------------------------------------
    def test_maj_1_affordable_lowercase_sentence_start_not_flagged(self):
        """Lowercase approved term capitalized at sentence start must NOT be flagged as a violation."""
        content = "Affordable products are comfortable."
        guidelines = {"approved_terms": ["affordable", "comfortable"]}
        client = _make_mock_client()

        result = analyze_brand_content(content, guidelines, [], _client=client)

        term_violations = [
            f for f in result["findings"]
            if f["category"] == FindingCategory.TERMINOLOGY.value and f["status"] == FindingStatus.VIOLATION.value
        ]
        assert len(term_violations) == 0
        assert result["overall_status"] == OverallStatus.PASS.value

    def test_maj_1_ecofriendly_canonical_flagged_when_lowercased(self):
        """Approved term with explicit uppercase letters must be flagged if casing differs."""
        content = "Our ecofriendly products lead the industry."
        guidelines = {"approved_terms": ["EcoFriendly"]}
        client = _make_mock_client()

        result = analyze_brand_content(content, guidelines, [], _client=client)

        term_violations = [
            f for f in result["findings"]
            if f["category"] == FindingCategory.TERMINOLOGY.value and f["status"] == FindingStatus.VIOLATION.value
        ]
        assert len(term_violations) == 1
        assert term_violations[0]["original_text"] == "ecofriendly"
        assert term_violations[0]["suggestion"] == "EcoFriendly"

    def test_maj_1_iphone_exact_casing_passes(self):
        """Approved term with exact camelCase (iPhone) passes cleanly."""
        content = "Compatible with the newest iPhone models."
        guidelines = {"approved_terms": ["iPhone"]}
        client = _make_mock_client()

        result = analyze_brand_content(content, guidelines, [], _client=client)

        term_violations = [
            f for f in result["findings"]
            if f["category"] == FindingCategory.TERMINOLOGY.value
        ]
        assert len(term_violations) == 0
        assert result["overall_status"] == OverallStatus.PASS.value

    # --------------------------------------------------------------------------
    # MAJOR-2: Punctuation-aware deterministic corrections
    # --------------------------------------------------------------------------
    def test_maj_2_punctuation_correction_yahoo(self):
        """Brand names ending in exclamation marks (Yahoo!) are corrected accurately."""
        content = "Visit yahoo! today for news."
        guidelines = {"brand_name": "Yahoo!"}
        client = _make_mock_client()

        result = analyze_brand_content(content, guidelines, [], _client=client)

        assert "Yahoo!" in result["corrected_content"]
        assert result["corrected_content"] == "Visit Yahoo! today for news."

    def test_maj_2_punctuation_correction_cpp(self):
        """Product names ending in plus signs (C++) are corrected accurately."""
        content = "Learn c++ programming basics."
        guidelines = {"approved_product_names": ["C++"]}
        client = _make_mock_client()

        result = analyze_brand_content(content, guidelines, [], _client=client)

        assert "C++" in result["corrected_content"]
        assert result["corrected_content"] == "Learn C++ programming basics."

    def test_maj_2_punctuation_correction_dotnet(self):
        """Product names beginning with punctuation (.NET) are corrected accurately."""
        content = "Build on .net framework today."
        guidelines = {"approved_product_names": [".NET"]}
        client = _make_mock_client()

        result = analyze_brand_content(content, guidelines, [], _client=client)

        assert ".NET" in result["corrected_content"]
        assert result["corrected_content"] == "Build on .NET framework today."

    def test_maj_2_punctuation_unrelated_occurrences_unchanged(self):
        """Surrounding text and already correctly capitalized names remain unchanged."""
        content = "Learn C++ and c++ programming."
        guidelines = {"approved_product_names": ["C++"]}
        client = _make_mock_client()

        result = analyze_brand_content(content, guidelines, [], _client=client)

        assert result["corrected_content"] == "Learn C++ and C++ programming."

    # --------------------------------------------------------------------------
    # MAJOR-3: Whitespace-normalized semantic deduplication
    # --------------------------------------------------------------------------
    def test_maj_3_deduplication_newline_vs_space(self):
        """Findings matching across a newline are deduplicated against single-space semantic findings."""
        content = "Guaranteed\nprofit on investments."
        guidelines = {"prohibited_terms": ["guaranteed profit"]}
        # Gemini also flags the prohibited term, but formats with standard space
        client = _make_mock_client({
            "overall_status": "FAIL",
            "summary": "Prohibited term detected.",
            "findings": [
                {
                    "finding_id": "sem-dup-1",
                    "category": FindingCategory.TERMINOLOGY.value,
                    "severity": Severity.HIGH.value,
                    "status": FindingStatus.VIOLATION.value,
                    "original_text": "guaranteed profit",
                    "explanation": "Gemini duplicate finding.",
                }
            ],
            "corrected_content": None,
        })

        result = analyze_brand_content(content, guidelines, [], _client=client)

        # Deduplication must merge deterministic ('guaranteed\nprofit') and semantic ('guaranteed profit')
        term_findings = [f for f in result["findings"] if f["category"] == FindingCategory.TERMINOLOGY.value]
        assert len(term_findings) == 1

    def test_maj_3_deduplication_multiple_spaces_vs_single(self):
        """Findings with multiple internal spaces are deduplicated against single-space findings."""
        content = "Our   special   offer is active."
        guidelines = {"prohibited_terms": ["special offer"]}
        client = _make_mock_client({
            "overall_status": "FAIL",
            "summary": "Prohibited term detected.",
            "findings": [
                {
                    "finding_id": "sem-dup-2",
                    "category": FindingCategory.TERMINOLOGY.value,
                    "severity": Severity.HIGH.value,
                    "status": FindingStatus.VIOLATION.value,
                    "original_text": "special offer",
                    "explanation": "Gemini duplicate finding.",
                }
            ],
            "corrected_content": None,
        })

        result = analyze_brand_content(content, guidelines, [], _client=client)

        term_findings = [f for f in result["findings"] if f["category"] == FindingCategory.TERMINOLOGY.value]
        assert len(term_findings) == 1

    def test_maj_3_deduplication_different_categories_remain_separate(self):
        """Identical text flagged under different categories must NOT be merged."""
        content = "PowerWidget"
        client = _make_mock_client({
            "overall_status": "NEEDS_REVIEW",
            "summary": "Multiple findings.",
            "findings": [
                {
                    "finding_id": "f-cat-1",
                    "category": FindingCategory.BRAND_CONSISTENCY.value,
                    "severity": Severity.MEDIUM.value,
                    "status": FindingStatus.VIOLATION.value,
                    "original_text": "PowerWidget",
                    "explanation": "Product casing review.",
                },
                {
                    "finding_id": "f-cat-2",
                    "category": FindingCategory.BRAND_TONE.value,
                    "severity": Severity.LOW.value,
                    "status": FindingStatus.VIOLATION.value,
                    "original_text": "PowerWidget",
                    "explanation": "Tone issue with widget naming.",
                },
            ],
            "corrected_content": None,
        })

        result = analyze_brand_content(content, {}, [], _client=client)

        # Different categories must preserve both findings
        assert len(result["findings"]) == 2
        categories = {f["category"] for f in result["findings"]}
        assert FindingCategory.BRAND_CONSISTENCY.value in categories
        assert FindingCategory.BRAND_TONE.value in categories

    def test_maj_3_deduplication_different_original_findings_preserved(self):
        """Distinct text snippets under the same category are both preserved."""
        content = "We guarantee quick delivery and cheap pricing."
        guidelines = {"prohibited_terms": ["quick delivery", "cheap"]}
        client = _make_mock_client()

        result = analyze_brand_content(content, guidelines, [], _client=client)

        term_findings = [f for f in result["findings"] if f["category"] == FindingCategory.TERMINOLOGY.value]
        assert len(term_findings) == 2

    # --------------------------------------------------------------------------
    # MIN-1: Evidence grounding safeguard
    # --------------------------------------------------------------------------
    def test_min_1_evidence_grounding_unrelated_approved_fact(self):
        """Citing a valid fact ID with completely fabricated, ungrounded evidence demotes to NEEDS_REVIEW."""
        content = "Our software cures cardiovascular disease."
        facts = [
            {
                "id": "fact-os-compat",
                "claim": "Our software runs on Linux, Windows, and macOS operating systems.",
                "evidence": "OS Compatibility Matrix 2026",
            }
        ]
        # Gemini hallucinates SUPPORTED and fabricates evidence mentioning fact-os-compat
        client = _make_mock_client({
            "overall_status": "PASS",
            "summary": "Medical claim evaluated.",
            "findings": [
                {
                    "finding_id": "fake-grounding-1",
                    "category": FindingCategory.CLAIM_VERIFICATION.value,
                    "severity": Severity.INFO.value,
                    "status": FindingStatus.SUPPORTED.value,
                    "original_text": "cures cardiovascular disease",
                    "explanation": "Medical claim verified.",
                    "evidence": "fact-os-compat: Double blind clinical trials confirmed efficacy.",
                    "confidence": 0.95,
                }
            ],
            "corrected_content": None,
        })

        result = analyze_brand_content(content, {}, approved_facts=facts, _client=client)

        # Must be demoted to NEEDS_REVIEW because evidence has zero grounding in fact-os-compat
        finding = result["findings"][0]
        assert finding["status"] == FindingStatus.NEEDS_REVIEW.value
        assert result["overall_status"] == OverallStatus.NEEDS_REVIEW.value

    def test_min_1_evidence_grounding_fabricated_contradiction_demoted(self):
        """Contradiction without substantive grounding in the cited approved fact demotes to NEEDS_REVIEW."""
        content = "Our service guarantees fast onboarding."
        facts = [
            {
                "id": "fact-uptime-02",
                "claim": "Cloud servers maintain 99.95% annual uptime.",
                "evidence": "Infrastructure Annual Audit",
            }
        ]
        # Gemini claims CONTRADICTED citing fact-uptime-02, but fabricated evidence has no grounding
        client = _make_mock_client({
            "overall_status": "FAIL",
            "summary": "Onboarding conflict.",
            "findings": [
                {
                    "finding_id": "fake-contra-1",
                    "category": FindingCategory.CLAIM_VERIFICATION.value,
                    "severity": Severity.HIGH.value,
                    "status": FindingStatus.CONTRADICTED.value,
                    "original_text": "guarantees fast onboarding",
                    "explanation": "Directly contradicts server uptime standard.",
                    "evidence": "fact-uptime-02: Onboarding takes 45 days according to HR manual.",
                    "confidence": 0.9,
                }
            ],
            "corrected_content": None,
        })

        result = analyze_brand_content(content, {}, approved_facts=facts, _client=client)

        finding = result["findings"][0]
        assert finding["status"] == FindingStatus.NEEDS_REVIEW.value
        assert result["overall_status"] == OverallStatus.NEEDS_REVIEW.value
