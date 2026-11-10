import pytest
from unittest.mock import AsyncMock, patch
from app.services.url_extractor import URLExtractorService
from app.core.errors import ValidationException


def test_reviewer_cannot_perform_editor_management_actions(client, reviewer_token, editor_token):
    reviewer_headers = {"Authorization": f"Bearer {reviewer_token}"}
    editor_headers = {"Authorization": f"Bearer {editor_token}"}

    # 1. Setup Brand as Editor (should succeed)
    brand_res = client.post(
        "/api/v1/brands",
        json={"name": "RBAC Test Brand", "industry": "Technology"},
        headers=editor_headers,
    )
    assert brand_res.status_code == 201
    brand_id = brand_res.json()["data"]["id"]

    # 2. Reviewer attempts to create a brand -> 403 FORBIDDEN
    rev_brand_res = client.post(
        "/api/v1/brands",
        json={"name": "Unauthorized Brand"},
        headers=reviewer_headers,
    )
    assert rev_brand_res.status_code == 403
    assert rev_brand_res.json()["error"]["code"] == "FORBIDDEN"

    # 3. Reviewer attempts to create guidelines -> 403 FORBIDDEN
    rev_guide_res = client.post(
        f"/api/v1/brands/{brand_id}/guidelines",
        json={"brand_personality": ["Bold"]},
        headers=reviewer_headers,
    )
    assert rev_guide_res.status_code == 403

    # 4. Reviewer attempts to add terminology -> 403 FORBIDDEN
    rev_term_res = client.post(
        f"/api/v1/brands/{brand_id}/terminology",
        json={"term": "badword", "term_type": "PROHIBITED"},
        headers=reviewer_headers,
    )
    assert rev_term_res.status_code == 403

    # 5. Reviewer attempts to add approved facts -> 403 FORBIDDEN
    rev_fact_res = client.post(
        f"/api/v1/brands/{brand_id}/facts",
        json={"claim": "Unverified claim", "evidence": "None"},
        headers=reviewer_headers,
    )
    assert rev_fact_res.status_code == 403

    # 6. Reviewer attempts to create submission -> 403 FORBIDDEN
    rev_sub_res = client.post(
        "/api/v1/submissions",
        json={"brand_id": brand_id, "title": "Sub", "content": "Text"},
        headers=reviewer_headers,
    )
    assert rev_sub_res.status_code == 403

    # 7. BUT Reviewer CAN view brand, guidelines, terminology, approved facts
    assert client.get(f"/api/v1/brands/{brand_id}", headers=reviewer_headers).status_code == 200
    assert client.get(f"/api/v1/brands/{brand_id}/guidelines", headers=reviewer_headers).status_code == 200
    assert client.get(f"/api/v1/brands/{brand_id}/terminology", headers=reviewer_headers).status_code == 200
    assert client.get(f"/api/v1/brands/{brand_id}/facts", headers=reviewer_headers).status_code == 200


def test_reviewer_rejection_requires_mandatory_comment(client, editor_token, reviewer_token):
    editor_headers = {"Authorization": f"Bearer {editor_token}"}
    reviewer_headers = {"Authorization": f"Bearer {reviewer_token}"}

    # 1. Create brand & submission as editor
    brand = client.post(
        "/api/v1/brands",
        json={"name": "Rejection Brand"},
        headers=editor_headers,
    ).json()["data"]

    sub = client.post(
        "/api/v1/submissions",
        json={
            "brand_id": brand["id"],
            "title": "Ad Copy",
            "content": "Super performance guarantees.",
        },
        headers=editor_headers,
    ).json()["data"]

    # Analyze to transition to NEEDS_REVIEW
    client.post(f"/api/v1/submissions/{sub['id']}/analyze", headers=editor_headers)

    # 2. Reviewer tries to reject without comments -> 400 Bad Request
    reject_empty = client.post(
        f"/api/v1/submissions/{sub['id']}/reject",
        json={"comments": ""},
        headers=reviewer_headers,
    )
    assert reject_empty.status_code == 400
    assert "mandatory" in reject_empty.json()["error"]["message"].lower()

    reject_none = client.post(
        f"/api/v1/submissions/{sub['id']}/reject",
        json={},
        headers=reviewer_headers,
    )
    assert reject_none.status_code == 400

    # 3. Reviewer rejects with substantive reason -> 200 OK
    reject_valid = client.post(
        f"/api/v1/submissions/{sub['id']}/reject",
        json={"comments": "Contains unsubstantiated performance guarantees."},
        headers=reviewer_headers,
    )
    assert reject_valid.status_code == 200
    assert reject_valid.json()["data"]["decision"] == "REJECTED"


def test_ssrf_protection_validation():
    # Test blocked schemes
    with pytest.raises(ValidationException, match="Unsupported URL protocol"):
        URLExtractorService.validate_url_safety("ftp://example.com/file.txt")

    with pytest.raises(ValidationException, match="Unsupported URL protocol"):
        URLExtractorService.validate_url_safety("file:///etc/passwd")

    # Test blocked loopback / localhost
    with pytest.raises(ValidationException, match="prohibited"):
        URLExtractorService.validate_url_safety("http://localhost:8000/api")

    with pytest.raises(ValidationException, match="prohibited"):
        URLExtractorService.validate_url_safety("http://127.0.0.1:3000")

    # Test blocked cloud metadata
    with pytest.raises(ValidationException, match="prohibited"):
        URLExtractorService.validate_url_safety("http://169.254.169.254/latest/meta-data")

    with pytest.raises(ValidationException, match="prohibited"):
        URLExtractorService.validate_url_safety("http://metadata.google.internal/computeMetadata/v1")


@pytest.mark.asyncio
async def test_url_extraction_endpoint(client, editor_token):
    headers = {"Authorization": f"Bearer {editor_token}"}

    # Mock fetch_and_extract
    mock_extracted = {
        "url": "https://example-brand.com",
        "title": "Example Brand Clean Luxury",
        "content": "Discover our sustainably crafted footwear engineered with circular marine polymers.",
        "character_count": 86,
        "word_count": 10,
    }

    with patch("app.services.url_extractor.URLExtractorService.fetch_and_extract", new=AsyncMock(return_value=mock_extracted)):
        res = client.post(
            "/api/v1/submissions/extract-url",
            json={"url": "https://example-brand.com"},
            headers=headers,
        )
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["title"] == "Example Brand Clean Luxury"
        assert "sustainably crafted" in data["content"]


@pytest.mark.asyncio
async def test_submission_from_url_creation(client, editor_token):
    headers = {"Authorization": f"Bearer {editor_token}"}

    # 1. Create brand
    brand = client.post(
        "/api/v1/brands",
        json={"name": "Web Brand"},
        headers=headers,
    ).json()["data"]

    mock_extracted = {
        "url": "https://webbrand-test.com/product",
        "title": "Web Brand Landing Page",
        "content": "Our revolutionary apparel delivers unbeatable comfort and style.",
        "character_count": 64,
        "word_count": 8,
    }

    with patch("app.services.url_extractor.URLExtractorService.fetch_and_extract", new=AsyncMock(return_value=mock_extracted)):
        res = client.post(
            "/api/v1/submissions/from-url",
            json={
                "brand_id": brand["id"],
                "url": "https://webbrand-test.com/product",
                "channel": "Website",
            },
            headers=headers,
        )
        assert res.status_code == 201
        data = res.json()["data"]
        assert data["brand_id"] == brand["id"]
        assert data["channel"] == "Website"
        assert "unbeatable" in data["content"]
        assert data["status"] == "NEEDS_REVIEW"


def test_cors_configuration():
    from app.core.config import settings
    origins = settings.cors_origins
    assert "http://localhost:5173" in origins
    assert "http://127.0.0.1:5173" in origins
    assert "http://localhost:3000" in origins
    assert "http://127.0.0.1:3000" in origins

