import sys
import httpx

BASE_URL = "http://127.0.0.1:8000/api/v1"


def run_audit():
    print("[1/10] Testing Registration & Login...")
    client = httpx.Client(base_url=BASE_URL, timeout=10.0)

    # 1. Register Workspace Alpha Admin
    reg_admin = client.post("/auth/register", json={
        "email": "alpha_admin@acmecorp.com",
        "password": "SecretPassword123!",
        "full_name": "Alice Admin",
        "role": "ADMIN",
        "workspace_id": "workspace-alpha"
    })
    assert reg_admin.status_code == 201, f"Admin reg failed: {reg_admin.text}"
    token_admin = reg_admin.json()["data"]["access_token"]

    # 2. Register Workspace Alpha Editor
    reg_editor = client.post("/auth/register", json={
        "email": "alpha_editor@acmecorp.com",
        "password": "SecretPassword123!",
        "full_name": "Bob Editor",
        "role": "EDITOR",
        "workspace_id": "workspace-alpha"
    })
    assert reg_editor.status_code == 201, f"Editor reg failed: {reg_editor.text}"
    token_editor = reg_editor.json()["data"]["access_token"]

    # 3. Register Workspace Alpha Reviewer
    reg_reviewer = client.post("/auth/register", json={
        "email": "alpha_reviewer@acmecorp.com",
        "password": "SecretPassword123!",
        "full_name": "Rachel Reviewer",
        "role": "REVIEWER",
        "workspace_id": "workspace-alpha"
    })
    assert reg_reviewer.status_code == 201, f"Reviewer reg failed: {reg_reviewer.text}"
    token_reviewer = reg_reviewer.json()["data"]["access_token"]

    # 4. Register Workspace Beta User (Competitor / Tenant Isolation Test)
    reg_beta = client.post("/auth/register", json={
        "email": "beta_user@rivalcorp.com",
        "password": "SecretPassword123!",
        "full_name": "Charlie Competitor",
        "role": "EDITOR",
        "workspace_id": "workspace-beta"
    })
    assert reg_beta.status_code == 201, f"Beta reg failed: {reg_beta.text}"
    token_beta = reg_beta.json()["data"]["access_token"]

    # Test /auth/me
    headers_editor = {"Authorization": f"Bearer {token_editor}"}
    me_res = client.get("/auth/me", headers=headers_editor)
    assert me_res.status_code == 200, f"/auth/me failed: {me_res.text}"
    me_data = me_res.json()["data"]
    assert me_data["email"] == "alpha_editor@acmecorp.com"
    assert me_data["workspace_id"] == "workspace-alpha"
    assert me_data["role"] == "EDITOR"
    print("  -> Auth & JWT verification successful.")

    # 5. Brand CRUD
    print("[2/10] Testing Brand CRUD...")
    brand_res = client.post("/brands", headers=headers_editor, json={
        "name": "CloudNova Enterprise",
        "description": "Enterprise cloud security and AI infrastructure.",
        "industry": "Cybersecurity",
        "website": "https://cloudnova.io"
    })
    assert brand_res.status_code == 201, f"Brand creation failed: {brand_res.text}"
    brand_id = brand_res.json()["data"]["id"]
    print(f"  -> Brand created with ID: {brand_id}")

    # Cross-workspace isolation check: Beta user tries to access Alpha brand
    headers_beta = {"Authorization": f"Bearer {token_beta}"}
    unauth_brand = client.get(f"/brands/{brand_id}", headers=headers_beta)
    assert unauth_brand.status_code == 403, f"Cross-workspace barrier breached: {unauth_brand.text}"
    assert unauth_brand.json()["error"]["code"] == "FORBIDDEN"
    print("  -> Cross-workspace barrier confirmed (HTTP 403 FORBIDDEN).")

    # Update brand
    patch_brand = client.patch(f"/brands/{brand_id}", headers=headers_editor, json={
        "description": "Enterprise sovereign cloud security and AI governance."
    })
    assert patch_brand.status_code == 200
    assert "governance" in patch_brand.json()["data"]["description"]

    # 6. Guidelines CRUD
    print("[3/10] Testing Brand Guidelines CRUD...")
    guide_res = client.post(f"/brands/{brand_id}/guidelines", headers=headers_editor, json={
        "brand_personality": ["Authoritative", "Innovative", "Transparent"],
        "tone_of_voice": {
            "dos": ["Be clear", "Back claims with empirical benchmarks"],
            "donts": ["Avoid hyperbole", "Never use absolute superlatives"]
        },
        "messaging_rules": {
            "tagline": "Uncompromising Security for Autonomous AI",
            "pillars": ["Zero Trust", "Sovereign Cloud", "Explainable Governance"]
        },
        "additional_guidelines": "Maintain formal tone in all press releases and marketing collateral."
    })
    assert guide_res.status_code == 201
    guide_id = guide_res.json()["data"]["id"]

    get_guide = client.get(f"/brands/{brand_id}/guidelines", headers=headers_editor)
    assert get_guide.status_code == 200
    assert get_guide.json()["data"]["tone_of_voice"]["donts"][0] == "Avoid hyperbole"
    print("  -> Guidelines successfully stored and retrieved.")

    # 7. Terminology CRUD
    print("[4/10] Testing Terminology CRUD...")
    # Add Prohibited Term
    term_res = client.post(f"/brands/{brand_id}/terminology", headers=headers_editor, json={
        "term": "unhackable",
        "term_type": "PROHIBITED",
        "preferred_replacement": "militarily hardened zero-trust",
        "description": "No system is mathematically unhackable. Absolute claims invite severe regulatory liability."
    })
    assert term_res.status_code == 201
    term_id = term_res.json()["data"]["id"]

    # Add Preferred Term
    client.post(f"/brands/{brand_id}/terminology", headers=headers_editor, json={
        "term": "cheap cloud",
        "term_type": "PREFERRED",
        "preferred_replacement": "cost-optimized architecture",
        "description": "Brand conveys premium quality."
    })

    terms_list = client.get(f"/brands/{brand_id}/terminology", headers=headers_editor)
    assert terms_list.status_code == 200
    assert len(terms_list.json()["data"]) == 2
    print(f"  -> Added 2 terminology rules for brand {brand_id}.")

    # 8. Approved Facts CRUD
    print("[5/10] Testing Approved Facts CRUD...")
    fact_res = client.post(f"/brands/{brand_id}/facts", headers=headers_editor, json={
        "claim": "CloudNova reduces threat response times by 68%.",
        "evidence": "2025 Third-Party Cyber Defense Benchmark Report across 200 enterprise SOC audits.",
        "source": "https://cloudnova.io/audit-2025.pdf",
        "approval_status": "APPROVED",
        "tags": ["performance", "soc", "latency"]
    })
    assert fact_res.status_code == 201
    fact_id = fact_res.json()["data"]["id"]

    facts_list = client.get(f"/brands/{brand_id}/facts", headers=headers_editor)
    assert facts_list.status_code == 200
    assert len(facts_list.json()["data"]) == 1
    print("  -> Verified facts registered.")

    # 9. Content Submission
    print("[6/10] Testing Content Submission Workflow...")
    # Draft marketing copy containing the prohibited term 'unhackable' and an unverified claim
    sub_res = client.post("/submissions", headers=headers_editor, json={
        "brand_id": brand_id,
        "title": "CloudNova Product Launch Press Release",
        "content": (
            "CloudNova announces its revolutionary, unhackable cloud security engine. "
            "Our cheap cloud delivers best in the world performance with unmatched miracles. "
            "Guaranteed wealth for modern enterprise IT infrastructure."
        ),
        "channel": "Press Release"
    })
    assert sub_res.status_code == 201
    sub_data = sub_res.json()["data"]
    sub_id = sub_data["id"]
    assert sub_data["status"] == "DRAFT"
    print(f"  -> Submission created in DRAFT state with ID: {sub_id}")

    # 10. AI Analysis Trigger & Findings Generation
    print("[7/10] Testing AI Analysis & Findings Detection...")
    analyze_res = client.post(f"/submissions/{sub_id}/analyze", headers=headers_editor)
    assert analyze_res.status_code == 200, f"Analysis failed: {analyze_res.text}"
    analyzed_data = analyze_res.json()["data"]
    
    assert analyzed_data["status"] == "NEEDS_REVIEW", f"Unexpected status: {analyzed_data['status']}"
    assert analyzed_data["compliance_score"] < 100.0
    findings = analyzed_data["findings"]
    assert len(findings) >= 2, f"Expected multiple findings, got {len(findings)}"
    print(f"  -> AI Analysis successfully identified {len(findings)} findings. Compliance Score: {analyzed_data['compliance_score']}")

    # Verify specific finding for 'unhackable'
    prohibited_finding = next((f for f in findings if "unhackable" in f["matched_text"].lower()), None)
    assert prohibited_finding is not None
    assert prohibited_finding["category"] == "TERMINOLOGY"
    assert prohibited_finding["severity"] == "CRITICAL"
    assert "militarily hardened" in prohibited_finding["suggestion"]
    print(f"  -> Terminology rule verified: Flagged '{prohibited_finding['matched_text']}' with suggestion '{prohibited_finding['suggestion']}'")

    # 11. Findings API & Resolution
    print("[8/10] Testing Findings Retrieval & Resolution...")
    findings_res = client.get(f"/submissions/{sub_id}/findings", headers=headers_editor)
    assert findings_res.status_code == 200
    assert len(findings_res.json()["data"]) == len(findings)

    patch_find = client.patch(f"/findings/{prohibited_finding['id']}", headers=headers_editor, json={"is_resolved": True})
    assert patch_find.status_code == 200
    assert patch_find.json()["data"]["is_resolved"] is True
    print("  -> Finding resolution successfully toggled.")

    # 12. Revisions & Re-analysis
    print("[9/10] Testing Revisions & Re-analysis Workflow...")
    # Editor updates content to fix issues
    rev_res = client.post(f"/submissions/{sub_id}/revisions", headers=headers_editor, json={
        "content": (
            "CloudNova announces its revolutionary, militarily hardened zero-trust cloud security engine. "
            "Our cost-optimized architecture delivers CloudNova reduces threat response times by 68% "
            "as validated in independent audits."
        ),
        "changes_summary": "Replaced 'unhackable' with approved terminology, incorporated approved evidence claim."
    })
    assert rev_res.status_code == 201
    assert rev_res.json()["data"]["version"] == 2

    # Re-analyze clean copy
    clean_analysis = client.post(f"/submissions/{sub_id}/analyze", headers=headers_editor)
    assert clean_analysis.status_code == 200
    clean_sub = clean_analysis.json()["data"]
    assert clean_sub["compliance_score"] == 100.0, f"Expected 100 score, got {clean_sub['compliance_score']}"
    assert len(clean_sub["findings"]) == 0
    print(f"  -> Clean copy scored 100% compliance with 0 findings.")

    # 13. Approvals & Anti-Self-Approval Verification
    print("[10/10] Testing Approval Workflow & Anti-Self-Approval Enforcement...")
    # Attempt 1: Editor author attempts to self-approve
    self_approve = client.post(f"/submissions/{sub_id}/approve", headers=headers_editor, json={"comments": "Author self approval"})
    assert self_approve.status_code == 403, f"Self-approval was incorrectly permitted: {self_approve.text}"
    assert self_approve.json()["error"]["code"] == "FORBIDDEN"
    print("  -> Anti-self-approval correctly blocked author self-approval (HTTP 403 FORBIDDEN).")

    # Attempt 2: Authorized Reviewer approves
    headers_reviewer = {"Authorization": f"Bearer {token_reviewer}"}
    reviewer_approve = client.post(f"/submissions/{sub_id}/approve", headers=headers_reviewer, json={
        "comments": "Audited revised copy against CloudNova guidelines. Fully compliant. Approved for publication."
    })
    assert reviewer_approve.status_code == 200
    assert reviewer_approve.json()["data"]["decision"] == "APPROVED"

    sub_final = client.get(f"/submissions/{sub_id}", headers=headers_reviewer).json()["data"]
    assert sub_final["status"] == "APPROVED"
    print("  -> Reviewer approval successful. Submission state transitioned to APPROVED.")

    # 14. Dashboard Summary
    dash_res = client.get("/dashboard/summary", headers=headers_editor)
    assert dash_res.status_code == 200
    metrics = dash_res.json()["data"]["metrics"]
    assert metrics["total_submissions"] >= 1
    assert metrics["approved_submissions"] >= 1
    print(f"  -> Dashboard metrics verified: {metrics}")

    print("\n>>> ALL 10 AUDIT CHECKS PASSED WITH REALISTIC DATA! <<<")


if __name__ == "__main__":
    try:
        run_audit()
    except Exception as e:
        print(f"\n[AUDIT FAILURE] {e}", file=sys.stderr)
        sys.exit(1)

