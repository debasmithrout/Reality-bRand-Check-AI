"""
Reality bRand Check AI - Comprehensive AI Adapter Integration Tests
Covers all 14 required adapter transformation and normalization scenarios:
1. Preferred terminology mapping
2. Prohibited terminology mapping
3. Brand name and industry mapping
4. Tone and personality mapping
5. Additional rules mapping
6. BRAND_TONE category mapping
7. All severity mappings
8. All overall status mappings
9. Unknown enum rejection
10. Missing optional confidence and evidence
11. Missing compliance score handling
12. AI PASS does not auto-approve
13. Gemini unavailable behavior
14. Heuristic fallback behavior
"""

import pytest
from unittest.mock import MagicMock

from app.ai.integration import (
    AIEngineAdapter,
    CATEGORY_MAPPING,
    OVERALL_STATUS_MAPPING,
    SEVERITY_MAPPING,
    calculate_deterministic_compliance_score,
)
from app.ai.exceptions import (
    AIEngineError,
    AI_API_ERROR,
    AI_TIMEOUT,
    AI_INVALID_RESPONSE,
)
from app.core.errors import AIServiceException
from app.models.submission import Submission
from app.services.analysis_service import AnalysisService


# ==============================================================================
# 1. Preferred Terminology Mapping
# ==============================================================================
def test_preferred_terminology_mapping():
    raw_guidelines = {}
    terminology = [
        {"term": "EcoFriendly", "term_type": "PREFERRED"},
        {"term": "NextGen", "term_type": "PREFERRED"},
    ]
    transformed = AIEngineAdapter._transform_guidelines_context(raw_guidelines, terminology)
    assert transformed["approved_terms"] == ["EcoFriendly", "NextGen"]
    assert transformed["prohibited_terms"] == []


# ==============================================================================
# 2. Prohibited Terminology Mapping
# ==============================================================================
def test_prohibited_terminology_mapping():
    raw_guidelines = {}
    terminology = [
        {"term": "cheap", "term_type": "PROHIBITED"},
        {"term": "guaranteed profit", "term_type": "PROHIBITED"},
    ]
    transformed = AIEngineAdapter._transform_guidelines_context(raw_guidelines, terminology)
    assert transformed["prohibited_terms"] == ["cheap", "guaranteed profit"]
    assert transformed["approved_terms"] == []


# ==============================================================================
# 3. Brand Name and Industry Mapping
# ==============================================================================
def test_brand_name_and_industry_mapping():
    # Tests mapping brand.name -> brand_name and brand.industry -> industry
    raw_guidelines = {
        "name": "Acme Corp",
        "industry": "FinTech",
    }
    transformed = AIEngineAdapter._transform_guidelines_context(raw_guidelines)
    assert transformed["brand_name"] == "Acme Corp"
    assert transformed["industry"] == "FinTech"


# ==============================================================================
# 4. Tone and Personality Mapping
# ==============================================================================
def test_tone_and_personality_mapping():
    # Tests mapping brand_personality -> personality and tone_of_voice -> tone
    raw_guidelines = {
        "brand_personality": ["innovative", "bold"],
        "tone_of_voice": "Empowering, professional",
    }
    transformed = AIEngineAdapter._transform_guidelines_context(raw_guidelines)
    assert transformed["personality"] == ["innovative", "bold"]
    assert transformed["tone"] == "Empowering, professional"


# ==============================================================================
# 5. Additional Rules Mapping
# ==============================================================================
def test_additional_rules_mapping():
    # Tests combining messaging_rules and additional_guidelines -> additional_rules
    raw_guidelines = {
        "messaging_rules": ["Never use exclamation marks in headers.", "Always cite benchmark sources."],
        "additional_guidelines": ["Include copyright footer on all social media cards."],
    }
    transformed = AIEngineAdapter._transform_guidelines_context(raw_guidelines)
    assert len(transformed["additional_rules"]) == 3
    assert "Never use exclamation marks in headers." in transformed["additional_rules"]
    assert "Include copyright footer on all social media cards." in transformed["additional_rules"]


# ==============================================================================
# 6. BRAND_TONE Category Mapping
# ==============================================================================
def test_brand_tone_category_mapping():
    raw_ai_payload = {
        "overall_status": "NEEDS_REVIEW",
        "summary": "Detected 1 tone violation.",
        "findings": [
            {
                "category": "BRAND_TONE",
                "severity": "WARNING",
                "original_text": "Buy now or regret forever!",
                "explanation": "Aggressive sales pressure deviates from helpful tone.",
            }
        ]
    }
    normalized = AIEngineAdapter._validate_and_normalize_result(raw_ai_payload)
    # BRAND_TONE must be mapped strictly to TONE to prevent PostgreSQL CHECK failure
    assert normalized["findings"][0]["category"] == "TONE"


# ==============================================================================
# 7. All Severity Mappings
# ==============================================================================
def test_all_severity_mappings():
    severities_to_test = [
        ("CRITICAL", "CRITICAL"),
        ("HIGH", "WARNING"),
        ("MEDIUM", "WARNING"),
        ("LOW", "INFO"),
        ("INFO", "INFO"),
    ]
    for raw_sev, expected_mapped in severities_to_test:
        raw_payload = {
            "overall_status": "FLAGGED",
            "findings": [
                {
                    "category": "TERMINOLOGY",
                    "severity": raw_sev,
                    "original_text": "sample text",
                }
            ]
        }
        normalized = AIEngineAdapter._validate_and_normalize_result(raw_payload)
        assert normalized["findings"][0]["severity"] == expected_mapped, f"Failed for {raw_sev}"


# ==============================================================================
# 8. All Overall Status Mappings
# ==============================================================================
def test_all_overall_status_mappings():
    statuses_to_test = [
        ("PASS", "COMPLIANT"),
        ("APPROVED", "COMPLIANT"),
        ("NEEDS_REVIEW", "FLAGGED"),
        ("FAIL", "NON_COMPLIANT"),
        ("VIOLATION", "NON_COMPLIANT"),
    ]
    for raw_status, expected_mapped in statuses_to_test:
        raw_payload = {
            "overall_status": raw_status,
            "findings": [],
        }
        normalized = AIEngineAdapter._validate_and_normalize_result(raw_payload)
        assert normalized["overall_status"] == expected_mapped, f"Failed for {raw_status}"


# ==============================================================================
# 9. Unknown Enum Rejection
# ==============================================================================
def test_unknown_enum_rejection():
    # 1. Unknown category raises AIServiceException
    with pytest.raises(AIServiceException) as exc_cat:
        AIEngineAdapter._validate_and_normalize_result({
            "overall_status": "PASS",
            "findings": [{"category": "INVALID_UNKNOWN_CATEGORY", "severity": "INFO", "original_text": "x"}]
        })
    assert "Unknown finding category" in str(exc_cat.value)

    # 2. Unknown severity raises AIServiceException
    with pytest.raises(AIServiceException) as exc_sev:
        AIEngineAdapter._validate_and_normalize_result({
            "overall_status": "PASS",
            "findings": [{"category": "TONE", "severity": "EXTREME_SUPER_CRITICAL", "original_text": "x"}]
        })
    assert "Unknown finding severity" in str(exc_sev.value)

    # 3. Unknown overall status raises AIServiceException
    with pytest.raises(AIServiceException) as exc_stat:
        AIEngineAdapter._validate_and_normalize_result({
            "overall_status": "MAYBE_SOMEWHAT_COMPLIANT",
            "findings": []
        })
    assert "Unknown overall status" in str(exc_stat.value)


# ==============================================================================
# 10. Missing Optional Confidence and Evidence
# ==============================================================================
def test_missing_optional_confidence_and_evidence():
    raw_payload = {
        "overall_status": "PASS",
        "findings": [
            {
                "category": "TONE",
                "severity": "INFO",
                "original_text": "test",
                # confidence and evidence are omitted
            }
        ]
    }
    normalized = AIEngineAdapter._validate_and_normalize_result(raw_payload)
    finding = normalized["findings"][0]
    # Must strictly be None, NEVER defaulted to 1.0 or empty string
    assert finding["confidence"] is None
    assert finding["evidence"] is None


# ==============================================================================
# 11. Missing Compliance Score Handling
# ==============================================================================
def test_missing_compliance_score_handling():
    # 1. When AI response omits compliance_score, it must remain None (never artificially invented)
    raw_payload_without_score = {
        "overall_status": "PASS",
        "findings": [],
    }
    normalized = AIEngineAdapter._validate_and_normalize_result(raw_payload_without_score)
    assert normalized["compliance_score"] is None

    # 2. When AI response provides a score, it is preserved
    raw_payload_with_score = {
        "overall_status": "PASS",
        "compliance_score": 92.5,
        "findings": [],
    }
    normalized_with_score = AIEngineAdapter._validate_and_normalize_result(raw_payload_with_score)
    assert normalized_with_score["compliance_score"] == 92.5


# ==============================================================================
# 12. AI PASS Does Not Auto-Approve (Service Layer Test)
# ==============================================================================
def test_ai_pass_does_not_auto_approve_lifecycle(client, editor_token):
    headers = {"Authorization": f"Bearer {editor_token}"}

    # Create Brand
    brand_res = client.post(
        "/api/v1/brands",
        json={"name": "Lifecycle Brand", "industry": "Cloud Security"},
        headers=headers,
    )
    brand_id = brand_res.json()["data"]["id"]

    # Create Submission
    sub_res = client.post(
        "/api/v1/submissions",
        json={
            "brand_id": brand_id,
            "title": "Clean Marketing Announcement",
            "content": "Our zero-trust architecture secures distributed cloud infrastructure.",
            "channel": "Whitepaper",
        },
        headers=headers,
    )
    sub_id = sub_res.json()["data"]["id"]

    # Run Analysis
    analyzed_res = client.post(f"/api/v1/submissions/{sub_id}/analyze", headers=headers)
    assert analyzed_res.status_code == 200
    data = analyzed_res.json()["data"]

    # Verification: AI output is COMPLIANT, but submission lifecycle status MUST be NEEDS_REVIEW
    assert data["overall_status"] == "COMPLIANT"
    assert data["status"] == "NEEDS_REVIEW"
    assert data["status"] != "APPROVED"


# ==============================================================================
# 13. Gemini Unavailable Behavior
# ==============================================================================
@pytest.mark.asyncio
async def test_gemini_unavailable_behavior(monkeypatch):
    # Simulate GEMINI_API_KEY being configured, but Gemini throwing an upstream AIEngineError
    monkeypatch.setenv("GEMINI_API_KEY", "test-key-mock")

    mock_client = MagicMock()
    mock_client.generate_content.side_effect = AIEngineError(
        code=AI_API_ERROR,
        message="Upstream model quota exceeded.",
    )

    with pytest.raises(AIServiceException) as exc_info:
        await AIEngineAdapter.analyze(
            content="Some marketing text",
            brand_guidelines={},
            approved_facts=[],
            _client=mock_client,
        )

    # Must raise clear AIServiceException with code and message, never silently succeed or hide
    assert "AI Engine failure [AI_API_ERROR]" in str(exc_info.value)
    assert "Upstream model quota exceeded" in str(exc_info.value)


# ==============================================================================
# 14. Heuristic Fallback Behavior
# ==============================================================================
@pytest.mark.asyncio
async def test_heuristic_fallback_behavior(monkeypatch):
    # Ensure GEMINI_API_KEY is empty so adapter runs deterministic fallback
    monkeypatch.setenv("GEMINI_API_KEY", "")

    result = await AIEngineAdapter.analyze(
        content="We offer cheap hosting with 100% foolproof uptime and #1 performance.",
        brand_guidelines={
            "brand_name": "CloudHost",
            "prohibited_terms": ["cheap"],
            "tone": "Professional, avoid hyperbole and miracles",
        },
        approved_facts=[],
    )

    # Verifications for fallback engine:
    assert result["engine"] == "heuristic_fallback"
    assert "[Heuristic Fallback Engine]" in result["summary"]
    assert result["overall_status"] in ("FLAGGED", "NON_COMPLIANT")
    assert len(result["findings"]) >= 1

    # Confirms prohibited term "cheap" was caught deterministically
    prohibited_finding = next((f for f in result["findings"] if f["category"] == "TERMINOLOGY"), None)
    assert prohibited_finding is not None
    assert prohibited_finding["original_text"] == "cheap"
    assert prohibited_finding["severity"] == "CRITICAL"

