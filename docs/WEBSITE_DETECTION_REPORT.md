# Reality bRand Check AI — Website Detection & URL Analysis Report

**Target:** Automated Website Detection & Content Extraction Pipeline  
**QA Lead:** Salman (AI/ML & QA Engineer)  
**Backend Lead Developer:** Debasmith Rout  
**Branch:** `develop`  
**Status:** **IMPLEMENTED WITH SSRF SECURITY BOUNDARIES (RESOLVED)**  

---

## 1. Executive Summary

In response to the feature gap identified in `BUG-001`, the **Safe Website URL Detection, Content Extraction, and SSRF Protection Pipeline** has been fully designed, implemented, and verified across the backend and frontend.

The system now enables marketing teams and brand compliance officers to:
1. Provide an external website URL (e.g. a live landing page or campaign microsite).
2. Safely extract core textual marketing content while filtering navigation menus, headers, footers, scripts, and decorative boilerplate.
3. Preview the extracted content in the editor or immediately execute an automated brand compliance check against the brand's tone guidelines and approved facts.
4. Review findings with full traceability back to the source URL.

All web scraping is strictly sandboxed by multi-layer Server-Side Request Forgery (SSRF) defenses, stream size limits, and hop-restricted redirect verification.

---

## 2. Technical Architecture & Security Model

### A. SSRF Defense Layer (`URLExtractorService.validate_url_safety`)
To protect internal infrastructure and cloud host environments, every submitted URL undergoes stringent validation before any socket connection is opened:

1. **Protocol Whitelisting:**
   - Only `http://` and `https://` schemes are permitted.
   - Schemes such as `file://`, `ftp://`, `gopher://`, `data:`, or `blob:` are rejected immediately with a `ValidationException` (HTTP 400).
2. **DNS Resolution & IP Range Check:**
   - Resolves the hostname using `socket.getaddrinfo`.
   - Evaluates all resolved IP addresses using Python's `ipaddress` module.
   - Blocks:
     - **Loopback addresses:** `127.0.0.0/8`, `::1` (`localhost`, `127.0.0.1`, `0.0.0.0`).
     - **Private subnet addresses:** `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`.
     - **Link-local addresses:** `169.254.0.0/16`, `fe80::/10`.
     - **Cloud metadata services:** Explicitly blocks `169.254.169.254` (AWS/GCP/Azure instance metadata) and `metadata.google.internal`.
     - **Multicast & Reserved ranges:** `224.0.0.0/4`, `240.0.0.0/4`.

### B. Safe Streaming & Resource Protection
- **Response Size Cap:** Downloads are streamed using `httpx.AsyncClient` up to a maximum limit of **2MB (`2,097,152` bytes)**. Responses exceeding this threshold are aborted with an exception to prevent memory exhaustion and zip/decompression bombs.
- **Connection Timeouts:** Configured with an 8.0-second total timeout to prevent slowloris hangs on unresponsive hosts.
- **Redirect Re-Validation:** Automatic redirects are disabled (`follow_redirects=False`). Redirects (HTTP 301, 302, 303, 307, 308) are handled manually up to a maximum depth of **3 hops**. Crucially, the target of each redirect is re-evaluated through the full SSRF IP safety check before following.

### C. Boilerplate Filtering & Text Extraction (`HTMLTextExtractor`)
Text extraction uses Python's standard library `html.parser.HTMLParser` (zero new external package dependencies, ensuring deterministic security and performance):
- **Ignored Tags:** Automatically ignores content within:
  - `<nav>`, `<header>`, `<footer>`, `<aside>` (boilerplate site chrome).
  - `<script>`, `<style>`, `<noscript>` (executable or style tokens).
  - `<svg>`, `<canvas>`, `<video>`, `<audio>` (non-textual media).
  - `<button>`, `<form>`, `<input>`, `<select>` (interactive controls).
- **Extracted Elements:** Gathers text from `<title>`, `<h1>`–`<h6>`, `<p>`, `<span>`, `<blockquote>`, `<li>`, and content containers.
- **Text Normalization:** Collapses consecutive whitespace and strips control characters, producing clean, paragraph-separated marketing copy suitable for the AI engine.

---

## 3. API Endpoints

### 1. `POST /api/v1/submissions/extract-url`
- **Purpose:** Extracts webpage text and metadata without immediately persisting a submission, allowing editors to review and edit extracted copy before auditing.
- **Request Body:**
  ```json
  {
    "url": "https://example-brand.com/campaign"
  }
  ```
- **Response (HTTP 200):**
  ```json
  {
    "success": true,
    "data": {
      "url": "https://example-brand.com/campaign",
      "title": "Example Campaign Page",
      "content": "Discover our sustainably crafted footwear...",
      "character_count": 86,
      "word_count": 10
    }
  }
  ```

### 2. `POST /api/v1/submissions/from-url`
- **Purpose:** Automatically extracts text from a target URL, creates a submission in `ANALYZING` state, dispatches the AI compliance engine, and transitions to `NEEDS_REVIEW` with findings.
- **Request Body:**
  ```json
  {
    "brand_id": "019d0000-0000-7000-8000-000000000001",
    "url": "https://example-brand.com/campaign",
    "channel": "Website"
  }
  ```
- **Response (HTTP 201):** Returns full `SubmissionResponse` including persisted findings, compliance score, and revision history.

---

## 4. Frontend User Experience

- **Source Mode Switcher:** Located at the top of `/review`:
  - `Direct Copy`: Traditional text editing experience.
  - `Website URL Audit`: Displays the URL input with security indicator.
- **Security Guidance:** Displays an info badge: *"Secure Website Audit: Protected against SSRF & internal network probing. Maximum page size: 2MB."*
- **Action Buttons:**
  - `Extract to Editor`: Downloads and strips the page, placing the clean copy directly into the textarea for manual inspection and revision before running checks.
  - `Direct Audit`: Extracts and runs the compliance engine in a single automated step.
- **Audit Report Integration:** When an audit originated from a website URL, the audit report header displays a badge indicating the source URL for full audit provenance.

---

## 5. Automated Test Results

| Test Case | Scope | Expected Result | Status |
| :--- | :--- | :--- | :--- |
| `test_ssrf_protection_validation` (Loopback) | `http://127.0.0.1:3000` | Blocked with `ValidationException` | **PASS** |
| `test_ssrf_protection_validation` (Localhost) | `http://localhost:8000/api` | Blocked with `ValidationException` | **PASS** |
| `test_ssrf_protection_validation` (Cloud Metadata) | `http://169.254.169.254/` | Blocked with `ValidationException` | **PASS** |
| `test_ssrf_protection_validation` (Google Cloud) | `http://metadata.google.internal/` | Blocked with `ValidationException` | **PASS** |
| `test_ssrf_protection_validation` (Bad Protocol) | `file:///etc/passwd`, `ftp://...` | Blocked with `ValidationException` | **PASS** |
| `test_url_extraction_endpoint` | Mocked valid external site | Returns title, text, and word count | **PASS** |
| `test_submission_from_url_creation` | URL to submission workflow | Creates submission, analyzes content | **PASS** |

---

## 6. Known Boundaries & Limitations

1. **Client-Side Rendered SPAs (CSR):**
   - The extractor parses standard HTML responses. Single Page Applications (SPAs) built with React, Vue, or Angular that render entirely client-side without Server-Side Rendering (SSR) will only return initial HTML shells (`<div id="root"></div>`).
   - For CSR web apps, users should use the "Direct Copy" mode or deploy pre-rendered HTML.
2. **Authentication & Paywalls:**
   - The extractor cannot bypass paywalls, basic auth, or login forms on external sites.
3. **Multimodal Visual Analysis:**
   - The extractor parses textual DOM content only. Web images, CSS styling, and visual layouts are not audited.
