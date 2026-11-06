def test_approval_workflow_and_anti_self_approval(client, editor_token, reviewer_token, admin_token):
    editor_headers = {"Authorization": f"Bearer {editor_token}"}
    reviewer_headers = {"Authorization": f"Bearer {reviewer_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Setup Brand & Submission as Editor
    brand_res = client.post(
        "/api/v1/brands",
        json={"name": "Gov Brand", "industry": "Finance"},
        headers=editor_headers,
    )
    brand_id = brand_res.json()["data"]["id"]

    sub_res = client.post(
        "/api/v1/submissions",
        json={
            "brand_id": brand_id,
            "title": "Quarterly Shareholder Update",
            "content": "Our Q3 performance was strong and resilient.",
            "channel": "Press Release",
        },
        headers=editor_headers,
    )
    sub_id = sub_res.json()["data"]["id"]

    # Analyze submission
    client.post(f"/api/v1/submissions/{sub_id}/analyze", headers=editor_headers)

    # 2. Test Anti-Self-Approval: Editor author cannot approve their own submission
    self_approve_res = client.post(
        f"/api/v1/submissions/{sub_id}/approve",
        json={"comments": "Looks good to me"},
        headers=editor_headers,
    )
    assert self_approve_res.status_code == 403
    assert self_approve_res.json()["error"]["code"] == "FORBIDDEN"

    # 3. Test Authorized Reviewer Approval
    review_approve_res = client.post(
        f"/api/v1/submissions/{sub_id}/approve",
        json={"comments": "Verified and complies with brand policies."},
        headers=reviewer_headers,
    )
    assert review_approve_res.status_code == 200
    approval_data = review_approve_res.json()["data"]
    assert approval_data["decision"] == "APPROVED"

    # Verify submission status is now APPROVED
    get_sub = client.get(f"/api/v1/submissions/{sub_id}", headers=reviewer_headers)
    assert get_sub.status_code == 200
    assert get_sub.json()["data"]["status"] == "APPROVED"


def test_dashboard_summary(client, editor_token, reviewer_token):
    editor_headers = {"Authorization": f"Bearer {editor_token}"}
    reviewer_headers = {"Authorization": f"Bearer {reviewer_token}"}

    # Get Dashboard
    dash_res = client.get("/api/v1/dashboard/summary", headers=editor_headers)
    assert dash_res.status_code == 200
    data = dash_res.json()["data"]
    assert "metrics" in data
    assert "total_submissions" in data["metrics"]
    assert "active_brands_count" in data

