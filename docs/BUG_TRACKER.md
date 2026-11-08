# Reality bRand Check AI — Bug Tracker & Defect Log

**QA Phase:** Full Application Integration, Governance Implementation & Pre-Release QA  
**QA Lead / Engineer:** Salman (AI/ML & QA Engineer)  
**Backend Lead / Reviewer:** Debasmith Rout  
**Branch:** `develop`  
**Latest Audit:** Post-P12 Implementation & Integration  

---

## Defect Summary

| Bug ID | Severity | Category | Component | Status | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-001** | **P1 (High)** | Feature Gap | Backend & Frontend | **RESOLVED** | Website URL Detection & Safe Web Extraction Pipeline Implemented with SSRF Protection |
| **BUG-002** | **P2 (Medium)** | Feature Scope | AI Engine | **DOCUMENTED LIMITATION** | Visual Branding / Campaign Banner Analysis Not Supported (Engine is Text-Only by Design) |
| **BUG-003** | **P2 (Medium)** | Security / RBAC | Backend `dependencies.py` | **RESOLVED** | `require_editor` Restricted to `["ADMIN", "EDITOR"]`; Reviewer Disallowed from Write Mutations |
| **BUG-004** | **P3 (Low)** | Configuration | Backend `config.py` | **RESOLVED** | Default CORS Configuration Updated to Include `http://127.0.0.1:5173` & `http://127.0.0.1:3000` |

---

## Detailed Bug Reports & Resolutions

### BUG-001: Website URL Detection & Web Scraping Pipeline is Not Implemented
- **ID:** `BUG-001`
- **Severity:** **P1 (High / Major Functional Gap)**
- **Component:** Backend (`app/services/url_extractor.py`, `app/routers/submissions.py`, `app/schemas/submission.py`), Frontend (`src/pages/ContentReviewPage.tsx`, `src/services/submissionService.ts`)
- **Initial Problem:**
  - Neither backend nor frontend supported entering a website URL for automated brand compliance auditing.
  - Users were restricted to copying and pasting marketing copy manually.
- **Resolution Implemented:**
  1. Created `backend/app/services/url_extractor.py` featuring:
     - Strict SSRF IP filtering (`ipaddress` resolution blocking loopback `127.0.0.0/8`, private subnets `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, link-local `169.254.0.0/16`, and cloud metadata endpoints such as `metadata.google.internal` and `169.254.169.254`).
     - Protocol validation (strictly `http://` and `https://` only; file/ftp/gopher blocked).
     - Streaming response consumption with a strict 2MB maximum size cap to eliminate memory exhaustion / ZIP-bomb risks.
     - Maximum 3 manual HTTP redirects with re-validation of each target IP to prevent redirect-based SSRF.
     - Built-in `html.parser` DOM extraction that strips `<nav>`, `<header>`, `<footer>`, `<aside>`, `<script>`, `<style>`, `<svg>`, `<button>`, and `<form>` tags while retaining article, body, and heading text.
  2. Implemented Backend Endpoints:
     - `POST /api/v1/submissions/extract-url`: Extracts clean text and word count from external URL for frontend review and editing.
     - `POST /api/v1/submissions/from-url`: Directly extracts text from external URL and runs automated brand compliance analysis.
  3. Implemented Frontend Features:
     - Added Source Mode switcher in `ContentReviewPage.tsx` (`Direct Copy` vs `Website URL Audit`).
     - URL validation input with instant feedback, SSRF security badge, "Extract to Editor" action, and "Direct Audit" action.
     - Audit report displays source URL badge when audited from a website.
- **Verification Tests:**
  - `backend/tests/test_rbac_and_url_extraction.py::test_ssrf_protection_validation` (PASS)
  - `backend/tests/test_rbac_and_url_extraction.py::test_url_extraction_endpoint` (PASS)
  - `backend/tests/test_rbac_and_url_extraction.py::test_submission_from_url_creation` (PASS)
  - `frontend/src/services/__tests__/submissionService.test.ts` (PASS)
- **Status:** **RESOLVED** (Note: Client-side JavaScript SPA rendering is a documented limitation; static HTML text extraction is supported).

---

### BUG-002: Visual Branding / Campaign Banner Analysis Not Supported (Text-Only)
- **ID:** `BUG-002`
- **Severity:** **P2 (Medium / Capability Limitation)**
- **Component:** AI Engine (`backend/app/ai/`)
- **Observed Behavior:**
  - The AI analysis engine operates on textual marketing copy, claims, and product terminology.
  - Graphical banners (e.g., bright pink promotional images) cannot be inspected for hex color codes or typography guidelines directly by the text engine.
- **Resolution / Scope Decision:**
  - Preserved as a **Documented Limitation / Future Enhancement (Milestone 4)**.
  - The current scope of Reality bRand Check AI is text-first claim and tone verification. The architecture has been documented for multimodal image parts (`types.Part.from_bytes`) in the AI engine when image upload schemas are introduced in future releases.
- **Status:** **DOCUMENTED LIMITATION**

---

### BUG-003: `require_editor` Allows `REVIEWER` Role to Execute Editor Write Operations
- **ID:** `BUG-003`
- **Severity:** **P2 (Medium / Security RBAC Inconsistency)**
- **Component:** Backend Security (`backend/app/core/dependencies.py`)
- **Initial Problem:**
  - `require_editor = require_roles(["ADMIN", "EDITOR", "REVIEWER"])` allowed users with the `REVIEWER` role to create brands, guidelines, terminology, and submissions, violating role separation.
- **Resolution Implemented:**
  1. Updated `backend/app/core/dependencies.py`:
     ```python
     require_editor = require_roles(["ADMIN", "EDITOR"])
     ```
  2. Maintained `require_reviewer = require_roles(["ADMIN", "REVIEWER"])` for approvals and rejections.
  3. Added `ValidationException` (HTTP 400) in `backend/app/core/errors.py` and updated `backend/app/services/approval_service.py` to require a mandatory rejection explanation comment when a reviewer rejects content.
  4. Preserved reviewer read access across all brand governance endpoints (`/brands`, `/guidelines`, `/terminology`, `/facts`).
- **Verification Tests:**
  - `backend/tests/test_rbac_and_url_extraction.py::test_reviewer_cannot_perform_editor_management_actions` (PASS — asserts HTTP 403 on create brand, guidelines, terminology, facts, and submissions).
  - `backend/tests/test_rbac_and_url_extraction.py::test_reviewer_rejection_requires_mandatory_comment` (PASS — asserts HTTP 400 on empty rejection comment, HTTP 200 on valid rejection).
- **Status:** **RESOLVED**

---

### BUG-004: Default CORS Configuration Omits `http://127.0.0.1:5173`
- **ID:** `BUG-004`
- **Severity:** **P3 (Low / Developer Experience & Browser Automation)**
- **Component:** Backend Config (`backend/app/core/config.py`)
- **Initial Problem:**
  - Default `ALLOWED_ORIGINS` in `Settings` was `"http://localhost:3000,http://localhost:5173"`.
  - When accessing the frontend via `127.0.0.1` in automated browsers or development environments, preflight CORS requests failed.
- **Resolution Implemented:**
  - Updated `ALLOWED_ORIGINS` in `backend/app/core/config.py`:
    ```python
    ALLOWED_ORIGINS: Union[str, List[str]] = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173"
    ```
- **Verification Tests:**
  - `backend/tests/test_rbac_and_url_extraction.py::test_cors_configuration` (PASS)
- **Status:** **RESOLVED**
