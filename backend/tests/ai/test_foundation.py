"""
Unit tests for AI Engine Foundation - Reality bRand Check AI
Covers all requirements from CodeNexus India 2026 Round 2 AI Engine specifications.
"""

import json
import pytest

from app.ai.exceptions import (
    AIEngineError,
    AI_API_ERROR,
    AI_TIMEOUT,
    AI_INVALID_RESPONSE,
    AI_VALIDATION_ERROR,
    AI_CONFIGURATION_ERROR,
    SUPPORTED_ERROR_CODES,
)
from app.ai.schemas import (
    OverallStatus,
    FindingCategory,
    Severity,
    FindingStatus,
    BrandGuidelines,
    ApprovedFact,
    AnalysisInput,
    Finding,
    AnalysisResponse,
)
from app.ai.validators import (
    validate_analysis_input,
    validate_analysis_output,
)


# ==============================================================================
# 1. Custom Exception Tests
# ==============================================================================

class TestCustomException:
    def test_ai_engine_error_attributes(self):
        err = AIEngineError(code=AI_VALIDATION_ERROR, message="Invalid payload")
        assert err.code == AI_VALIDATION_ERROR
        assert err.message == "Invalid payload"
        assert str(err) == "[AI_VALIDATION_ERROR] Invalid payload"
        assert isinstance(err, Exception)

    def test_all_supported_error_codes(self):
        expected_codes = {
            "AI_API_ERROR",
            "AI_TIMEOUT",
            "AI_INVALID_RESPONSE",
            "AI_VALIDATION_ERROR",
            "AI_CONFIGURATION_ERROR",
        }
        assert SUPPORTED_ERROR_CODES == expected_codes


# ==============================================================================
# 2. Input Validation Tests (Requirements 1 - 5)
# ==============================================================================

class TestInputValidation:
    def test_1_valid_input(self):
        """Test 1: Valid input with content, brand guidelines, and approved facts."""
        content = "Welcome to Reality bRand Check AI. We provide accurate governance."
        guidelines = {
            "brand_name": "RealityCheck",
            "industry": "Software",
            "personality": "Innovative, Trustworthy",
            "tone": "Professional",
            "approved_terms": ["governance", "accuracy"],
            "prohibited_terms": ["cheap", "unverified"],
            "approved_product_names": ["Reality bRand Check"],
            "additional_rules": ["Avoid hyperbolic claims"],
        }
        facts = [
            {
                "id": "fact-001",
                "claim": "Reality bRand Check AI performs automated brand checks.",
                "evidence": "Product Specification Document v1.0",
                "source": "Internal Docs",
                "status": "SUPPORTED",
            }
        ]

        result = validate_analysis_input(content, guidelines, facts)

        assert isinstance(result, AnalysisInput)
        assert result.content == content
        assert result.brand_guidelines.brand_name == "RealityCheck"
        assert result.brand_guidelines.approved_terms == ["governance", "accuracy"]
        assert len(result.approved_facts) == 1
        assert result.approved_facts[0].id == "fact-001"
        assert result.approved_facts[0].claim == "Reality bRand Check AI performs automated brand checks."

    def test_2_empty_approved_facts(self):
        """Test 2: Empty approved facts list and None must both be accepted."""
        content = "Brand marketing copy here."
        guidelines = {"brand_name": "TestBrand"}

        # Empty list
        result1 = validate_analysis_input(content, guidelines, [])
        assert isinstance(result1, AnalysisInput)
        assert result1.approved_facts == []

        # None should be normalized to empty list
        result2 = validate_analysis_input(content, guidelines, None)
        assert isinstance(result2, AnalysisInput)
        assert result2.approved_facts == []

    def test_3_missing_optional_guideline_fields(self):
        """Test 3: Missing optional guideline fields must receive safe defaults."""
        content = "Some brand announcement text."

        # Completely empty guidelines dict
        result1 = validate_analysis_input(content, {}, [])
        assert result1.brand_guidelines.brand_name is None
        assert result1.brand_guidelines.approved_terms == []
        assert result1.brand_guidelines.prohibited_terms == []
        assert result1.brand_guidelines.additional_rules == []

        # Guidelines as None (normalized to {})
        result2 = validate_analysis_input(content, None, None)
        assert result2.brand_guidelines.brand_name is None
        assert result2.brand_guidelines.approved_terms == []

        # Partial guidelines
        result3 = validate_analysis_input(content, {"tone": "Friendly"}, [])
        assert result3.brand_guidelines.tone == "Friendly"
        assert result3.brand_guidelines.brand_name is None
        assert result3.brand_guidelines.approved_terms == []

    def test_4_empty_content_rejection(self):
        """Test 4: Empty string or whitespace-only content must be rejected."""
        with pytest.raises(AIEngineError) as exc_info1:
            validate_analysis_input("", {}, [])
        assert exc_info1.value.code == AI_VALIDATION_ERROR
        assert "non-empty string" in exc_info1.value.message

        with pytest.raises(AIEngineError) as exc_info2:
            validate_analysis_input("   \n\t   ", {}, [])
        assert exc_info2.value.code == AI_VALIDATION_ERROR
        assert "non-empty string" in exc_info2.value.message

    def test_5_invalid_input_types(self):
        """Test 5: Invalid input types must be rejected with AI_VALIDATION_ERROR."""
        # Non-string content (int, None, list)
        with pytest.raises(AIEngineError) as exc_int:
            validate_analysis_input(12345, {}, [])  # type: ignore
        assert exc_int.value.code == AI_VALIDATION_ERROR

        with pytest.raises(AIEngineError) as exc_none:
            validate_analysis_input(None, {}, [])  # type: ignore
        assert exc_none.value.code == AI_VALIDATION_ERROR

        # Non-dict brand guidelines
        with pytest.raises(AIEngineError) as exc_guidelines:
            validate_analysis_input("Valid content", "invalid guidelines string", [])  # type: ignore
        assert exc_guidelines.value.code == AI_VALIDATION_ERROR

        # Non-list approved facts
        with pytest.raises(AIEngineError) as exc_facts:
            validate_analysis_input("Valid content", {}, {"not": "a list"})  # type: ignore
        assert exc_facts.value.code == AI_VALIDATION_ERROR

        # Approved fact with empty claim
        with pytest.raises(AIEngineError) as exc_empty_claim:
            validate_analysis_input("Valid content", {}, [{"id": "f1", "claim": "  "}])
        assert exc_empty_claim.value.code == AI_VALIDATION_ERROR

    def test_preserves_original_content_formatting(self):
        """Original content with exact spaces and newlines must be preserved."""
        original = "  Line 1 with spaces. \n\nLine 2 with tab \t."
        result = validate_analysis_input(original, {}, [])
        assert result.content == original


# ==============================================================================
# 3. Output Validation Tests (Requirements 6 - 14)
# ==============================================================================

class TestOutputValidation:
    def test_6_valid_analysis_response(self):
        """Test 6: Valid analysis response should return a JSON-compatible dict."""
        response_data = {
            "overall_status": "NEEDS_REVIEW",
            "summary": "Found 1 minor tone issue and 1 unverified claim.",
            "findings": [
                {
                    "finding_id": "FIND-001",
                    "category": "BRAND_TONE",
                    "severity": "MEDIUM",
                    "status": "NEEDS_REVIEW",
                    "original_text": "We are insanely better than all competitors.",
                    "explanation": "Hyperbolic language contradicts brand guidelines on humble authority.",
                    "violated_guideline": "Avoid hyperbolic tone",
                    "evidence": "Tone guidelines section 2.1",
                    "suggestion": "We offer distinct architectural advantages over alternative solutions.",
                    "confidence": 0.92,
                }
            ],
            "corrected_content": "We offer distinct architectural advantages over alternative solutions.",
        }

        output = validate_analysis_output(response_data)

        assert isinstance(output, dict)
        assert output["overall_status"] == "NEEDS_REVIEW"
        assert output["summary"] == response_data["summary"]
        assert len(output["findings"]) == 1
        assert output["findings"][0]["finding_id"] == "FIND-001"
        assert output["findings"][0]["category"] == "BRAND_TONE"
        assert output["findings"][0]["severity"] == "MEDIUM"
        assert output["findings"][0]["status"] == "NEEDS_REVIEW"
        assert output["findings"][0]["confidence"] == 0.92
        assert output["corrected_content"] == response_data["corrected_content"]

        # Ensure 100% JSON serializable
        json_str = json.dumps(output)
        assert json_str is not None

    def test_7_empty_findings_array(self):
        """Test 7: Empty findings array is completely valid."""
        response_data = {
            "overall_status": "PASS",
            "summary": "Content complies with all brand guidelines and ground truth facts.",
            "findings": [],
            "corrected_content": None,
        }

        output = validate_analysis_output(response_data)
        assert output["overall_status"] == "PASS"
        assert output["findings"] == []
        assert output["corrected_content"] is None

    def test_8_invalid_severity(self):
        """Test 8: Invalid severity value must be rejected."""
        response_data = {
            "overall_status": "FAIL",
            "summary": "Test issue",
            "findings": [
                {
                    "finding_id": "F1",
                    "category": "BRAND_TONE",
                    "severity": "CATASTROPHIC",  # Invalid severity
                    "status": "VIOLATION",
                    "original_text": "text",
                    "explanation": "explanation",
                }
            ],
        }

        with pytest.raises(AIEngineError) as exc_info:
            validate_analysis_output(response_data)
        assert exc_info.value.code == AI_INVALID_RESPONSE
        assert "severity" in exc_info.value.message

    def test_9_invalid_finding_category(self):
        """Test 9: Invalid finding category must be rejected."""
        response_data = {
            "overall_status": "FAIL",
            "summary": "Test issue",
            "findings": [
                {
                    "finding_id": "F1",
                    "category": "UNOFFICIAL_CATEGORY",  # Invalid category
                    "severity": "HIGH",
                    "status": "VIOLATION",
                    "original_text": "text",
                    "explanation": "explanation",
                }
            ],
        }

        with pytest.raises(AIEngineError) as exc_info:
            validate_analysis_output(response_data)
        assert exc_info.value.code == AI_INVALID_RESPONSE
        assert "category" in exc_info.value.message

    def test_10_confidence_below_zero(self):
        """Test 10: Confidence below 0 must be rejected."""
        response_data = {
            "overall_status": "FAIL",
            "summary": "Test issue",
            "findings": [
                {
                    "finding_id": "F1",
                    "category": "CLAIM_VERIFICATION",
                    "severity": "CRITICAL",
                    "status": "CONTRADICTED",
                    "original_text": "text",
                    "explanation": "explanation",
                    "confidence": -0.05,  # Below 0
                }
            ],
        }

        with pytest.raises(AIEngineError) as exc_info:
            validate_analysis_output(response_data)
        assert exc_info.value.code == AI_INVALID_RESPONSE
        assert "confidence" in exc_info.value.message.lower()

    def test_11_confidence_above_one(self):
        """Test 11: Confidence above 1 must be rejected."""
        response_data = {
            "overall_status": "FAIL",
            "summary": "Test issue",
            "findings": [
                {
                    "finding_id": "F1",
                    "category": "CLAIM_VERIFICATION",
                    "severity": "CRITICAL",
                    "status": "CONTRADICTED",
                    "original_text": "text",
                    "explanation": "explanation",
                    "confidence": 1.25,  # Above 1
                }
            ],
        }

        with pytest.raises(AIEngineError) as exc_info:
            validate_analysis_output(response_data)
        assert exc_info.value.code == AI_INVALID_RESPONSE
        assert "confidence" in exc_info.value.message.lower()

    def test_12_null_evidence(self):
        """Test 12: Null evidence is valid in findings."""
        response_data = {
            "overall_status": "PASS",
            "summary": "Issue without explicit evidence document",
            "findings": [
                {
                    "finding_id": "F1",
                    "category": "BRAND_CONSISTENCY",
                    "severity": "LOW",
                    "status": "SUPPORTED",
                    "original_text": "Approved statement",
                    "explanation": "Matches standard messaging",
                    "evidence": None,
                    "suggestion": None,
                    "confidence": 0.85,
                }
            ],
        }

        output = validate_analysis_output(response_data)
        assert output["findings"][0]["evidence"] is None
        assert output["findings"][0]["suggestion"] is None

    def test_13_null_corrected_content(self):
        """Test 13: Null corrected_content is valid."""
        response_data = {
            "overall_status": "PASS",
            "summary": "All guidelines met perfectly.",
            "findings": [],
            "corrected_content": None,
        }

        output = validate_analysis_output(response_data)
        assert output["corrected_content"] is None

    def test_14_invalid_output_structure(self):
        """Test 14: Non-dict, missing required fields, or invalid overall_status rejected."""
        # Non-dict response
        with pytest.raises(AIEngineError) as exc_not_dict:
            validate_analysis_output("string response")  # type: ignore
        assert exc_not_dict.value.code == AI_INVALID_RESPONSE

        # None response
        with pytest.raises(AIEngineError) as exc_none:
            validate_analysis_output(None)  # type: ignore
        assert exc_none.value.code == AI_INVALID_RESPONSE

        # Missing required overall_status
        with pytest.raises(AIEngineError) as exc_missing_status:
            validate_analysis_output({"summary": "missing overall status"})
        assert exc_missing_status.value.code == AI_INVALID_RESPONSE

        # Invalid overall_status value
        with pytest.raises(AIEngineError) as exc_bad_status:
            validate_analysis_output({
                "overall_status": "PERFECT",  # Not in OverallStatus enum
                "summary": "summary text",
                "findings": [],
            })
        assert exc_bad_status.value.code == AI_INVALID_RESPONSE


# ==============================================================================
# 4. Confidence Boundary and Pydantic Model Direct Tests
# ==============================================================================

class TestConfidenceBoundaries:
    def test_confidence_boundary_zero(self):
        finding = Finding(
            finding_id="F0",
            category=FindingCategory.BRAND_TONE,
            severity=Severity.INFO,
            status=FindingStatus.NEEDS_REVIEW,
            original_text="text",
            explanation="explanation",
            confidence=0.0,
        )
        assert finding.confidence == 0.0

    def test_confidence_boundary_one(self):
        finding = Finding(
            finding_id="F1",
            category=FindingCategory.BRAND_TONE,
            severity=Severity.INFO,
            status=FindingStatus.NEEDS_REVIEW,
            original_text="text",
            explanation="explanation",
            confidence=1.0,
        )
        assert finding.confidence == 1.0

    def test_confidence_null(self):
        finding = Finding(
            finding_id="F_null",
            category=FindingCategory.BRAND_TONE,
            severity=Severity.INFO,
            status=FindingStatus.NEEDS_REVIEW,
            original_text="text",
            explanation="explanation",
            confidence=None,
        )
        assert finding.confidence is None
