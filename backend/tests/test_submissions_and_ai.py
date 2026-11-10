def test_submission_lifecycle_and_ai_analysis(client, editor_token):
    headers = {"Authorization": f"Bearer {editor_token}"}

    # 1. Setup Brand & Rules
    brand_res = client.post(
        "/api/v1/brands",
        json={"name": "Pulse Tech", "industry": "Consumer Tech"},
        headers=headers,
    )
    brand_id = brand_res.json()["data"]["id"]

    # Add Prohibited Terminology
    client.post(
        f"/api/v1/brands/{brand_id}/terminology",
        json={
            "term": "cheapest price",
            "term_type": "PROHIBITED",
            "preferred_replacement": "most affordable value",
            "description": "Brand prohibits race-to-the-bottom pricing language.",
        },
        headers=headers,
    )

    # 2. Create Submission
    sub_payload = {
        "brand_id": brand_id,
        "title": "Black Friday Promo Copy",
        "content": "Get our products with the cheapest price guaranteed on the market today!",
        "channel": "Social Media",
    }
    sub_res = client.post("/api/v1/submissions", json=sub_payload, headers=headers)
    assert sub_res.status_code == 201
    sub_data = sub_res.json()["data"]
    sub_id = sub_data["id"]
    assert sub_data["status"] == "DRAFT"

    # 3. Trigger AI Analysis
    analyze_res = client.post(f"/api/v1/submissions/{sub_id}/analyze", headers=headers)
    assert analyze_res.status_code == 200
    analyzed_sub = analyze_res.json()["data"]

    # Verify status changed to NEEDS_REVIEW
    assert analyzed_sub["status"] == "NEEDS_REVIEW"
    # Prohibited term penalty applied
    assert analyzed_sub["compliance_score"] < 100.0
    assert len(analyzed_sub["findings"]) >= 1

    # Check finding details
    finding = analyzed_sub["findings"][0]
    assert finding["category"] == "TERMINOLOGY"
    assert finding["severity"] == "CRITICAL"
    assert "cheapest price" in finding["matched_text"].lower()
    assert "most affordable value" in finding["suggestion"]

    # 4. Resolve Finding
    finding_id = finding["id"]
    patch_finding_res = client.patch(
        f"/api/v1/findings/{finding_id}",
        json={"is_resolved": True},
        headers=headers,
    )
    assert patch_finding_res.status_code == 200
    assert patch_finding_res.json()["data"]["is_resolved"] is True

    # 5. Create Revision with corrected copy
    rev_payload = {
        "content": "Get our products with the most affordable value on the market today!",
        "changes_summary": "Replaced prohibited term with approved phrasing",
    }
    rev_res = client.post(f"/api/v1/submissions/{sub_id}/revisions", json=rev_payload, headers=headers)
    assert rev_res.status_code == 201
    assert rev_res.json()["data"]["version"] == 2

    # Re-analyze corrected copy
    reanalyze_res = client.post(f"/api/v1/submissions/{sub_id}/analyze", headers=headers)
    assert reanalyze_res.status_code == 200
    reanalyzed = reanalyze_res.json()["data"]
    assert reanalyzed["compliance_score"] == 100.0
    assert len(reanalyzed["findings"]) == 0

