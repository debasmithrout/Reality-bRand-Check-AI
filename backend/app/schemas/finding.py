from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class FindingUpdate(BaseModel):
    is_resolved: Optional[bool] = None


class FindingResponse(BaseModel):
    id: str  # Backend UUID primary key
    submission_id: str
    ai_finding_id: Optional[str] = None  # Synthetic ID from AI module (e.g., "F-001")

    category: str  # TONE, TERMINOLOGY, CLAIM_VERIFICATION, BRAND_CONSISTENCY, GRAMMAR
    severity: str  # CRITICAL, WARNING, INFO

    # Canonical text field + backward-compatible optional alias
    original_text: str
    matched_text: Optional[str] = None

    explanation: str
    suggestion: str

    # Canonical guideline field + backward-compatible alias
    violated_guideline: Optional[str] = None
    rule_reference: Optional[str] = None

    # Explainability & confidence metrics
    evidence: Optional[str] = None
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)

    # Finding status from AI engine vs human editor resolution
    finding_status: Optional[str] = None
    is_resolved: bool = False

    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
