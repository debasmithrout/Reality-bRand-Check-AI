import pytest
from app.ai.integration import AIEngineAdapter, calculate_deterministic_compliance_score


def test_salman_format_normalization():
    """
    Verifies that Salman's proposed AI output structure is normalized seamlessly,
    populating canonical fields, aliases, corrected content, and evidence.
    """
    raw_salman_payload = {
        "overall_status": "FLAGGED",
        "summary": "Marketing copy has 1 prohibited term.",
        "corrected_content": "We offer premium zero-trust architecture.",
        "findings": [
            {
                "finding_id": "SALMAN-001",
                "category": "terminology",
                "severity": "HIGH",
                "status": "FLAGGED",
                "original_text": "cheapest cloud",
                "explanation": "Brand prohibits race-to-bottom vocabulary.",
                "violated_guideline": "Terminology Rule: Prohibited Words",
                "evidence": "Brand Guide v2, Page 14 prohibits 'cheapest'.",
                "confidence": 0.94,
                "suggestion": "Replace with 'premium cost-effective architecture'."
            }
        ]
    }

    normalized = AIEngineAdapter._validate_and_normalize_result(raw_salman_payload)

    # Top-level checks
    assert normalized["overall_status"] == "FLAGGED"
    assert normalized["summary"] == "Marketing copy has 1 prohibited term."
    assert normalized["corrected_content"] == "We offer premium zero-trust architecture."
    # Since compliance_score was not in Salman's raw payload, it is None (not invented)
    assert normalized["compliance_score"] is None

    # Finding checks
    assert len(normalized["findings"]) == 1
    f = normalized["findings"][0]
    assert f["ai_finding_id"] == "SALMAN-001"
    assert f["category"] == "TERMINOLOGY"
    assert f["severity"] == "WARNING"  # HIGH mapped to WARNING per agreed severity mapping
    assert f["original_text"] == "cheapest cloud"
    assert f["matched_text"] == "cheapest cloud"  # Alias populated
    assert f["violated_guideline"] == "Terminology Rule: Prohibited Words"
    assert f["rule_reference"] == "Terminology Rule: Prohibited Words"  # Alias populated
    assert f["evidence"] == "Brand Guide v2, Page 14 prohibits 'cheapest'."
    assert f["confidence"] == 0.94
    assert f["finding_status"] == "FLAGGED"


def test_legacy_backend_format_normalization():
    """
    Verifies backward compatibility when incoming data uses original backend field names.
    """
    raw_legacy_payload = {
        "compliance_score": 85.0,
        "summary": "1 warning finding detected.",
        "findings": [
            {
                "category": "TONE",
                "severity": "WARNING",
                "matched_text": "best in the galaxy",
                "explanation": "Avoid hyperbole.",
                "suggestion": "State factual benchmark instead.",
                "rule_reference": "Tone of Voice Rule #3"
            }
        ]
    }

    normalized = AIEngineAdapter._validate_and_normalize_result(raw_legacy_payload)

    assert normalized["compliance_score"] == 85.0
    assert normalized["overall_status"] == "FLAGGED"
    assert normalized["corrected_content"] is None

    f = normalized["findings"][0]
    assert f["original_text"] == "best in the galaxy"  # Canonical populated from matched_text
    assert f["matched_text"] == "best in the galaxy"
    assert f["violated_guideline"] == "Tone of Voice Rule #3"
    assert f["rule_reference"] == "Tone of Voice Rule #3"
    assert f["evidence"] is None  # Missing evidence is strictly None
    assert f["confidence"] is None  # Missing confidence is strictly None (NEVER 1.0)


def test_missing_confidence_is_null_never_one():
    """
    Verifies requirement: 'Preserve optional confidence between 0 and 1. If missing, use null, never 1.0.'
    """
    raw_payload = {
        "summary": "Check confidence.",
        "findings": [
            {
                "category": "GRAMMAR",
                "original_text": "its cool",
                "explanation": "Missing apostrophe.",
                "suggestion": "it's cool"
                # confidence intentionally omitted
            }
        ]
    }

    normalized = AIEngineAdapter._validate_and_normalize_result(raw_payload)
    assert normalized["findings"][0]["confidence"] is None


def test_deterministic_scoring_policy():
    """
    Verifies the explicit deterministic compliance scoring policy:
    Base 100, CRITICAL/HIGH -25, WARNING/MEDIUM -10, INFO/LOW -0.
    """
    findings = [
        {"severity": "CRITICAL"},
        {"severity": "WARNING"},
        {"severity": "INFO"},
    ]
    score = calculate_deterministic_compliance_score(findings)
    assert score == 65.0  # 100 - 25 - 10 - 0 = 65


def test_compliant_does_not_auto_approve(client, editor_token):
    """
    Verifies: 'COMPLIANT must never automatically approve a submission.'
    Submission state must transition to NEEDS_REVIEW, requiring a human reviewer.
    """
    headers = {"Authorization": f"Bearer {editor_token}"}

    # Create Brand
    brand_res = client.post(
        "/api/v1/brands",
        json={"name": "Compliant Brand", "industry": "Legal Tech"},
        headers=headers,
    )
    brand_id = brand_res.json()["data"]["id"]

    # Create Clean Submission
    sub_res = client.post(
        "/api/v1/submissions",
        json={
            "brand_id": brand_id,
            "title": "Clean Compliant Copy",
            "content": "Our legal technology automates contract compliance reviews.",
            "channel": "Blog",
        },
        headers=headers,
    )
    sub_id = sub_res.json()["data"]["id"]

    # Analyze clean submission
    analyzed_res = client.post(f"/api/v1/submissions/{sub_id}/analyze", headers=headers)
    assert analyzed_res.status_code == 200
    data = analyzed_res.json()["data"]

    # Even if overall_status is COMPLIANT and compliance_score is 100.0,
    # the submission lifecycle status MUST be NEEDS_REVIEW
    assert data["overall_status"] == "COMPLIANT"
    assert data["compliance_score"] == 100.0
    assert data["status"] == "NEEDS_REVIEW"
    assert data["status"] != "APPROVED"

