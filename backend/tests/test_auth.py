def test_register_user(client):
    payload = {
        "email": "newuser@example.com",
        "password": "securepassword",
        "full_name": "New Tester",
        "role": "EDITOR",
        "workspace_id": "test-workspace",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert "access_token" in data["data"]


def test_register_duplicate_user(client, editor_user):
    payload = {
        "email": editor_user.email,
        "password": "anotherpassword",
        "full_name": "Duplicate",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "CONFLICT"


def test_login_success(client, editor_user):
    payload = {
        "email": editor_user.email,
        "password": "password123",
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "access_token" in data["data"]


def test_login_wrong_password(client, editor_user):
    payload = {
        "email": editor_user.email,
        "password": "wrongpassword",
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "UNAUTHORIZED"


def test_get_me_authenticated(client, editor_token, editor_user):
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {editor_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["email"] == editor_user.email
    assert data["data"]["role"] == "EDITOR"


def test_get_me_missing_token(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "UNAUTHORIZED"

