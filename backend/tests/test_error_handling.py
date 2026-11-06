def test_not_found_error_format(client, editor_token):
    headers = {"Authorization": f"Bearer {editor_token}"}
    response = client.get("/api/v1/brands/non-existent-uuid", headers=headers)
    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert "error" in data
    assert data["error"]["code"] == "NOT_FOUND"
    assert "identifier" in data["error"]["message"].lower() or "not found" in data["error"]["message"].lower()


def test_validation_error_format(client, editor_token):
    headers = {"Authorization": f"Bearer {editor_token}"}
    # Send empty payload to POST /brands where name is required
    response = client.post("/api/v1/brands", json={}, headers=headers)
    assert response.status_code == 422
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert len(data["error"]["details"]) > 0
    assert any("name" in d.get("field", "") for d in data["error"]["details"])

