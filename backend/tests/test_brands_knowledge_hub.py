def test_brand_crud_and_workspace_isolation(client, editor_token, other_token):
    headers = {"Authorization": f"Bearer {editor_token}"}
    other_headers = {"Authorization": f"Bearer {other_token}"}

    # 1. Create Brand
    create_payload = {
        "name": "Acme Brand",
        "description": "Leading tech brand",
        "industry": "Software",
        "website": "https://acme.example.com",
    }
    create_res = client.post("/api/v1/brands", json=create_payload, headers=headers)
    assert create_res.status_code == 201
    brand_id = create_res.json()["data"]["id"]

    # 2. Get Brand (owner workspace)
    get_res = client.get(f"/api/v1/brands/{brand_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["data"]["name"] == "Acme Brand"

    # 3. Cross-workspace isolation: other workspace user cannot access
    unauth_res = client.get(f"/api/v1/brands/{brand_id}", headers=other_headers)
    assert unauth_res.status_code == 403
    assert unauth_res.json()["error"]["code"] == "FORBIDDEN"

    # 4. Update Brand
    update_res = client.patch(
        f"/api/v1/brands/{brand_id}",
        json={"description": "Updated brand overview"},
        headers=headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["data"]["description"] == "Updated brand overview"

    # 5. List Brands (should show only brands in test-workspace)
    list_res = client.get("/api/v1/brands", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()["data"]) >= 1


def test_guidelines_and_terminology_and_facts(client, editor_token):
    headers = {"Authorization": f"Bearer {editor_token}"}

    # Create Brand
    brand_res = client.post(
        "/api/v1/brands",
        json={"name": "Nexus AI", "industry": "Artificial Intelligence"},
        headers=headers,
    )
    brand_id = brand_res.json()["data"]["id"]

    # 1. Create Guidelines
    guideline_payload = {
        "brand_personality": ["Innovative", "Empathetic", "Direct"],
        "tone_of_voice": {
            "dos": ["Be precise", "Use active voice"],
            "donts": ["Avoid hyperbole", "Avoid unsubstantiated claims"],
        },
        "messaging_rules": {"tagline": "Real Intelligence, True Governance"},
        "additional_guidelines": "Maintain strict compliance standards.",
    }
    guide_res = client.post(
        f"/api/v1/brands/{brand_id}/guidelines",
        json=guideline_payload,
        headers=headers,
    )
    assert guide_res.status_code == 201
    assert guide_res.json()["data"]["brand_id"] == brand_id

    # Get Guidelines
    get_guide_res = client.get(f"/api/v1/brands/{brand_id}/guidelines", headers=headers)
    assert get_guide_res.status_code == 200
    assert get_guide_res.json()["data"]["brand_personality"] == ["Innovative", "Empathetic", "Direct"]

    # 2. Terminology: Add Prohibited Term
    term_payload = {
        "term": "miracle cure",
        "term_type": "PROHIBITED",
        "preferred_replacement": "scientific breakthrough",
        "description": "Never promise medical or miraculous guarantees.",
    }
    term_res = client.post(
        f"/api/v1/brands/{brand_id}/terminology",
        json=term_payload,
        headers=headers,
    )
    assert term_res.status_code == 201
    term_id = term_res.json()["data"]["id"]

    # List Terminology
    terms_list_res = client.get(f"/api/v1/brands/{brand_id}/terminology", headers=headers)
    assert terms_list_res.status_code == 200
    assert len(terms_list_res.json()["data"]) == 1

    # 3. Approved Facts: Add Fact
    fact_payload = {
        "claim": "Nexus AI reduces governance cycle times by 40%.",
        "evidence": "Internal Q3 2025 benchmarking study with 50 enterprise pilots.",
        "source": "https://nexus.ai/research/whitepaper-2025.pdf",
        "approval_status": "APPROVED",
        "tags": ["performance", "speed"],
    }
    fact_res = client.post(
        f"/api/v1/brands/{brand_id}/facts",
        json=fact_payload,
        headers=headers,
    )
    assert fact_res.status_code == 201
    fact_id = fact_res.json()["data"]["id"]

    # List Facts
    facts_list_res = client.get(f"/api/v1/brands/{brand_id}/facts", headers=headers)
    assert facts_list_res.status_code == 200
    assert len(facts_list_res.json()["data"]) == 1

