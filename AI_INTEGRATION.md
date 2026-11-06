# AI Engine Integration Guide (app.ai)
**Reality bRand Check AI**
**Module Author:** Salman (AI/ML Engineer)
**Target Integration Developer:** Debasmith Rout (FastAPI Backend Developer)
**Branch:** `feature/ai-engine`
**Status:** Complete, Hardened & Integration-Ready (83 Tests Passing)

---

## 1. Module Overview

The `app.ai` package provides the complete, decoupled AI Analysis Engine for **Reality bRand Check AI**. It analyzes marketing copy, product announcements, and brand communications against brand guidelines and ground truth facts.

### Architectural Pipeline
The analysis engine executes a 7-stage evaluation pipeline:
1. **Input Validation & Normalization (`validators.py`)**: Sanitizes and enforces contracts on untrusted submitted content, brand guidelines, and ground truth facts.
2. **Fast Deterministic Rule Checking (`rule_checker.py`)**: Executes high-precision regex matching for prohibited terminology (whitespace- and newline-tolerant), casing rules for approved terms (protecting sentence-start lowercase terms while enforcing camelCase/uppercase terms like `EcoFriendly` or `iPhone`), and product/brand naming consistency.
3. **Semantic Analysis via Gemini (`gemini_client.py`, `prompts.py`)**: Submits untrusted content to Google Gemini (`gemini-3.5-flash`) with structured JSON schema outputs for tone matching, style consistency, and claim extraction.
4. **Anti-Hallucination & Evidence Grounding Safeguards (`analyzer.py`)**: Enforces strict semantic grounding. If no approved facts are supplied, claims cannot be classified as `SUPPORTED` or `CONTRADICTED`. Disallows fabricated fact IDs, negative explanation references, or synthetic evidence strings.
5. **Deduplication & Finding Aggregation (`analyzer.py`)**: Deduplicates overlapping deterministic and semantic findings with whitespace and punctuation normalization.
6. **Overall Status Aggregation (`analyzer.py`)**: Deterministically computes overall verdict (`PASS`, `NEEDS_REVIEW`, `FAIL`) based on finding severity and verification status.
7. **Corrected Content Generation (`analyzer.py`, `rule_checker.py`)**: Synthesizes clean, brand-compliant copy applying high-precision deterministic corrections without mutating unrelated words.

### Decoupling Guarantee
- **No FastAPI / Starlette dependencies** inside `app.ai`.
- **No database ORM / SQLAlchemy dependencies** inside `app.ai`.
- **Standard Python types & Pydantic v2 schemas only**.

---

## 2. Exact Main Entry Point

The public analysis function is located at:
```
backend/app/ai/analyzer.py
```
And re-exported from the package root:
```
backend/app/ai/__init__.py
```

---

## 3. Import Statement

Debasmith can import the function using either of the following standard paths:

```python
# Recommended primary import
from app.ai.analyzer import analyze_brand_content

# Alternative package root import
from app.ai import analyze_brand_content
```

*(Note: If importing from repository root without `backend` in `sys.path`, use `from backend.app.ai.analyzer import analyze_brand_content`.)*

---

## 4. Function Signature

```python
def analyze_brand_content(
    content: str,
    brand_guidelines: dict,
    approved_facts: list,
    *,
    _client: Optional[GeminiClient] = None,
) -> dict:
```

### Signature Contract Rules:
- **Exactly 3 positional arguments** are required: `content`, `brand_guidelines`, `approved_facts`.
- The `_client` parameter is **strictly keyword-only** (prefixed with `*`) and defaults to `None`. It is reserved exclusively for unit-test mock injection. Backend code must never pass `_client`.

---

## 5. Argument Descriptions

### `content: str` (Required)
The raw marketing or brand text to evaluate.
- Must be a non-empty string (`str`).
- Whitespace and original formatting are strictly preserved.
- Treated by the prompt engine as **untrusted user data**; prompt injection defenses prevent text from escaping fences or issuing rogue directives.

### `brand_guidelines: dict` (Required)
A dictionary of brand guidelines (normalized to `BrandGuidelines`). All keys are optional:
- `brand_name` (`Optional[str]`): Canonical brand name (e.g., `"EcoBrand"`).
- `industry` (`Optional[str]`): Business sector (e.g., `"Consumer Electronics"`).
- `personality` (`Optional[Union[str, List[str]]]`): Desired personality traits (e.g., `["innovative", "approachable"]`).
- `tone` (`Optional[Union[str, List[str]]]`): Target voice/tone (e.g., `["empowering", "professional"]`).
- `approved_terms` (`List[str]`): Whitelisted terms. Canonical casing is enforced only when uppercase characters exist in the guideline (e.g., `"EcoFriendly"`, `"iPhone"`). Common lowercase terms like `"affordable"` will not trigger false positives when capitalized at sentence start.
- `prohibited_terms` (`List[str]`): Blacklisted terms/phrases (e.g., `["guaranteed profit", "100% risk-free"]`). Detected deterministically via regex across arbitrary whitespace and newlines.
- `approved_product_names` (`List[str]`): Specific product names with enforced canonical casing.
- `additional_rules` (`List[str]`): Arbitrary extra rule directives.
*(Pass `{}` if no guidelines are specified).*

### `approved_facts: list` (Required)
A list of ground-truth fact dictionaries (normalized to `List[ApprovedFact]`). Each item should contain:
- `id` (`str`, required): Unique ground-truth identifier (e.g., `"FACT-101"`).
- `claim` (`str`, required): Verified factual statement (e.g., `"Battery lasts up to 24 hours under standard testing."`).
- `evidence` (`Optional[str]`): Benchmark citation or test report reference.
- `source` (`Optional[str]`): Authority document or URL.
- `status` (`Optional[str]`): Verification status.
*(Pass `[]` if no ground-truth facts are available. When empty, any factual claims in `content` are automatically safeguarded and demoted to `UNSUPPORTED` or `NEEDS_REVIEW`).*

---

## 6. Return Schema

The function returns a Python `dict` adhering to the `AnalysisResponse` Pydantic model:

```json
{
  "overall_status": "FAIL",
  "summary": "Brand content failed verification with 2 finding(s).",
  "findings": [
    {
      "finding_id": "DET-TERM-1",
      "category": "TERMINOLOGY",
      "severity": "HIGH",
      "status": "VIOLATION",
      "original_text": "guaranteed profit",
      "explanation": "The prohibited term 'guaranteed profit' was used in the content, violating brand guidelines.",
      "violated_guideline": "Prohibited term: guaranteed profit",
      "evidence": null,
      "suggestion": "Remove or replace prohibited term 'guaranteed profit'.",
      "confidence": 1.0
    },
    {
      "finding_id": "CLM-1",
      "category": "CLAIM_VERIFICATION",
      "severity": "HIGH",
      "status": "CONTRADICTED",
      "original_text": "Battery lasts 48 hours",
      "explanation": "Content claims 48 hours of battery life, but approved fact FACT-101 establishes maximum battery life is 24 hours.",
      "violated_guideline": "Approved Fact FACT-101",
      "evidence": "Lab benchmark report #402 confirms maximum 24h battery life.",
      "suggestion": "Update claim to state battery lasts up to 24 hours.",
      "confidence": 0.95
    }
  ],
  "corrected_content": "Our new EcoFriendly device offers reliable performance. Battery lasts up to 24 hours under standard usage."
}
```

### Schema Field Definitions:
- `overall_status` (`str`): Overall brand compliance verdict:
  - `"PASS"`: No findings, or only `INFO` severity / `SUPPORTED` claims.
  - `"NEEDS_REVIEW"`: Minor issues, `MEDIUM`/`LOW` severity, or `UNSUPPORTED`/`NEEDS_REVIEW` claims.
  - `"FAIL"`: Any `CRITICAL` or `HIGH` severity finding, prohibited term violation, or `CONTRADICTED` claim.
- `summary` (`str`): High-level executive summary of findings.
- `findings` (`List[dict]`): Structured list of detected issues. Each contains:
  - `finding_id` (`str`): Finding identifier (e.g., `"DET-TERM-1"`, `"CLM-1"`).
  - `category` (`str`): `"BRAND_TONE"`, `"TERMINOLOGY"`, `"CLAIM_VERIFICATION"`, `"BRAND_CONSISTENCY"`.
  - `severity` (`str`): `"CRITICAL"`, `"HIGH"`, `"MEDIUM"`, `"LOW"`, `"INFO"`.
  - `status` (`str`): `"SUPPORTED"`, `"UNSUPPORTED"`, `"CONTRADICTED"`, `"NEEDS_REVIEW"`, `"VIOLATION"`.
  - `original_text` (`str`): Exact substring quoted from original content.
  - `explanation` (`str`): Clear, objective explanation of the violation or verification result.
  - `violated_guideline` (`Optional[str]`): Name of violated rule or fact ID reference.
  - `evidence` (`Optional[str]`): Verifiable factual proof or citation (or `None`).
  - `suggestion` (`Optional[str]`): Actionable replacement recommendation.
  - `confidence` (`Optional[float]`): Confidence score from `0.0` to `1.0` (or `None`).
- `corrected_content` (`Optional[str]`): Suggested complete revision with violations resolved (or `None` if fully compliant or uncorrectable).

---

## 7. Error Behavior & Domain Exceptions

All exceptions raised by the engine inherit from `AIEngineError` (defined in `app.ai.exceptions`). The AI Engine **never** raises FastAPI `HTTPException` or database errors.

### Error Codes (`AIEngineError.code`):
| Code | Cause | Recommended HTTP Mapping |
| :--- | :--- | :--- |
| `AI_VALIDATION_ERROR` | Empty content, invalid types, or malformed input dicts | **422 Unprocessable Entity** |
| `AI_CONFIGURATION_ERROR` | Missing or blank `GEMINI_API_KEY` or invalid `GEMINI_TIMEOUT` | **500 Internal Server Error** |
| `AI_TIMEOUT` | Gemini API request exceeded timeout threshold (default 30s) | **504 Gateway Timeout** |
| `AI_API_ERROR` | Upstream network failure, connection drop, or Gemini HTTP/gRPC error | **502 Bad Gateway** |
| `AI_INVALID_RESPONSE` | Gemini returned empty text, malformed non-JSON, or schema violation | **502 Bad Gateway** |

### Credential Protection Guarantee:
All error messages emitted by `AIEngineError` pass through `_sanitize_message()`, which automatically strips and redacts API keys matching `AIza...`, query parameters, and secret values before logging or surfacing in messages.

---

## 8. Synchronous vs Asynchronous Execution

`analyze_brand_content` is a **synchronous, blocking function** because it executes CPU regex checks and blocking HTTP calls via the Google GenAI SDK.

> [!WARNING]
> In FastAPI `async def` endpoints, calling `analyze_brand_content(...)` directly on the event loop will block all other concurrent requests.
> **Always dispatch it to a worker thread pool using `run_in_threadpool`.**

```python
from starlette.concurrency import run_in_threadpool

# Correct FastAPI async invocation:
result = await run_in_threadpool(
    analyze_brand_content,
    content=request.content,
    brand_guidelines=request.brand_guidelines,
    approved_facts=request.approved_facts,
)
```

---

## 9. Dependencies

The AI Engine relies on the following verified dependencies (documented in `requirements-ai.txt`):

| Package | Version Requirement | Tested Version |
| :--- | :--- | :--- |
| `Python` | `>=3.10, <=3.14` | `3.14.3` |
| `google-genai` | `==2.34.0` | `2.34.0` |
| `pydantic` | `>=2.0.0, <3.0.0` | `2.13.5` |
| `httpx` | `>=0.27.0` | `0.28.1` |
| `pytest` | `>=8.0.0` (dev/test) | `9.1.1` |

---

## 10. Environment Configuration

Add the following environment variables to your `.env` file (see `.env.example`):

```bash
# Required: Google Gemini API Key
GEMINI_API_KEY=your_actual_gemini_api_key_here

# Optional: LLM Model identifier (default: gemini-3.5-flash)
GEMINI_MODEL=gemini-3.5-flash

# Optional: Request timeout in seconds (default: 30)
GEMINI_TIMEOUT=30
```

---

## 11. Installation Commands

To install AI Engine dependencies into your virtual environment:

```bash
pip install -r requirements-ai.txt
```

Or install them directly:
```bash
pip install google-genai==2.34.0 "pydantic>=2.0.0,<3.0.0" "httpx>=0.27.0"
```

---

## 12. Test Execution Commands

Run the complete 83-test verification suite from the repository root:

```bash
# Run all AI Engine unit and regression tests
python -m pytest backend/tests/ai/ -v

# Run with short test output
python -m pytest backend/tests/ai/
```

All 83 tests pass in under 1.2 seconds:
- `backend/tests/ai/test_foundation.py` (20 tests: schemas, validation, custom exceptions)
- `backend/tests/ai/test_gemini_client.py` (24 tests: config, timeouts, fenced JSON, prompt injection)
- `backend/tests/ai/test_analyzer.py` (39 tests: orchestrator, safeguards, casing, deduplication)

---

## 13. Example Backend Invocation using `run_in_threadpool`

Here is a complete, copy-pasteable FastAPI router implementation demonstrating proper integration:

```python
# backend/app/routers/analysis.py
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from app.ai.analyzer import analyze_brand_content
from app.ai.exceptions import (
    AIEngineError,
    AI_API_ERROR,
    AI_CONFIGURATION_ERROR,
    AI_INVALID_RESPONSE,
    AI_TIMEOUT,
    AI_VALIDATION_ERROR,
)

router = APIRouter(prefix="/analysis", tags=["Content Analysis"])


# 1. Request Schemas
class AnalysisRequest(BaseModel):
    content: str = Field(..., min_length=1, description="Content to analyze")
    brand_guidelines: Optional[Dict[str, Any]] = Field(default_factory=dict)
    approved_facts: Optional[List[Dict[str, Any]]] = Field(default_factory=list)


# 2. Endpoint Implementation
@router.post("/run", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
async def analyze_content_endpoint(request: AnalysisRequest):
    """
    Analyze marketing content against brand guidelines and ground truth facts.
    Offloads synchronous AI Engine execution to worker thread pool.
    """
    try:
        # Offload blocking AI Engine execution to worker threadpool
        raw_result = await run_in_threadpool(
            analyze_brand_content,
            content=request.content,
            brand_guidelines=request.brand_guidelines,
            approved_facts=request.approved_facts,
        )

        # Normalize response for backend database / frontend models
        return _adapt_ai_response_for_backend(raw_result)

    except AIEngineError as exc:
        if exc.code == AI_VALIDATION_ERROR:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"code": exc.code, "message": exc.message},
            )
        elif exc.code == AI_TIMEOUT:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail={"code": exc.code, "message": "AI analysis timed out. Please try again."},
            )
        elif exc.code in (AI_API_ERROR, AI_INVALID_RESPONSE):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={"code": exc.code, "message": exc.message},
            )
        elif exc.code == AI_CONFIGURATION_ERROR:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={"code": exc.code, "message": "AI Engine is not properly configured."},
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": str(exc)},
        )


# 3. Backend Adapter & Normalization Helper
def _adapt_ai_response_for_backend(ai_response: Dict[str, Any]) -> Dict[str, Any]:
    """
    Map AI engine output fields to backend DB models and 3-tier severity enum.
    """
    SEVERITY_MAP = {
        "CRITICAL": "CRITICAL",
        "HIGH": "WARNING",
        "MEDIUM": "WARNING",
        "LOW": "INFO",
        "INFO": "INFO",
    }

    adapted_findings = []
    for f in ai_response.get("findings", []):
        raw_sev = f.get("severity", "INFO")
        adapted_finding = {
            **f,
            # Normalize to 3-tier severity for backend DB/frontend
            "severity": SEVERITY_MAP.get(raw_sev, "INFO"),
            # Map original_text to matched_text if backend schema expects it
            "matched_text": f.get("original_text"),
            # Map violated_guideline to rule_reference if backend schema expects it
            "rule_reference": f.get("violated_guideline"),
            # Backend resolution status initialized separately
            "resolution_status": "UNRESOLVED",
        }
        adapted_findings.append(adapted_finding)

    return {
        **ai_response,
        "findings": adapted_findings,
    }
```

---

## 14. Severity Normalization Mapping

The AI Engine produces a 5-tier severity classification (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`). If the backend database or frontend uses a 3-tier system (`CRITICAL`, `WARNING`, `INFO`), apply the following mapping:

| AI Engine Severity | Backend / UI Normalized Severity | Description |
| :--- | :--- | :--- |
| `CRITICAL` | `CRITICAL` | Direct legal/regulatory violation, severe brand damage |
| `HIGH` | `WARNING` | Explicit prohibited term or contradicted ground truth claim |
| `MEDIUM` | `WARNING` | Unsupported factual claim, noticeable tone mismatch |
| `LOW` | `INFO` | Minor casing inconsistency or slight tone variation |
| `INFO` | `INFO` | Informational observation or supported claim verification |

> [!NOTE]
> The AI module preserves original 5-tier values. The backend adapter performs normalization as demonstrated above.

### Separate AI Status vs Human Resolution Status
- **AI Finding Status (`status`)**: `"SUPPORTED"`, `"UNSUPPORTED"`, `"CONTRADICTED"`, `"NEEDS_REVIEW"`, `"VIOLATION"`.
- **Human Resolution Status (`resolution_status`)**: `"UNRESOLVED"`, `"RESOLVED"`, `"DISMISSED"`.
These two concepts must remain distinct in database models. The AI Engine only sets the verification status.

---

## 15. Known Limitations & Anti-Hallucination Safeguards

1. **Approved Ground Truth Boundary**:
   The engine only verifies claims against facts provided in `approved_facts`. If `approved_facts` is empty or does not cover a claim, the claim is classified as `UNSUPPORTED` or `NEEDS_REVIEW`. It will **never** invent external facts or grant `SUPPORTED` status based on general LLM world knowledge.
2. **Deterministic Precedence**:
   Deterministic checks for prohibited terms and casing execute before semantic LLM analysis and take absolute precedence.
3. **Casing Heuristics**:
   Approved terms that are strictly lowercase in guidelines (e.g., `"affordable"`) are not flagged when capitalized at the beginning of a sentence. Specific casing is only enforced for guidelines with uppercase letters (e.g., `"EcoFriendly"`, `"ISO-9001"`, `"iPhone"`).
4. **NLP Entailment Boundary**:
   Claims that paraphrase approved facts are matched using Gemini's semantic evaluation. However, multi-step logical syllogisms or domain math are not inferred beyond direct textual entailment.
