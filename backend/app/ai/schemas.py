"""
Reality bRand Check AI - Pydantic Schemas for AI Engine
"""

from enum import Enum
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, ConfigDict, Field, field_validator


class OverallStatus(str, Enum):
    """Overall status of the analyzed brand content."""
    PASS = "PASS"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    FAIL = "FAIL"


class FindingCategory(str, Enum):
    """Categorization for specific guideline or fact-check findings."""
    BRAND_TONE = "BRAND_TONE"
    TERMINOLOGY = "TERMINOLOGY"
    CLAIM_VERIFICATION = "CLAIM_VERIFICATION"
    BRAND_CONSISTENCY = "BRAND_CONSISTENCY"


class Severity(str, Enum):
    """Severity levels for detected issues."""
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


class FindingStatus(str, Enum):
    """Verification status for individual findings."""
    SUPPORTED = "SUPPORTED"
    UNSUPPORTED = "UNSUPPORTED"
    CONTRADICTED = "CONTRADICTED"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    VIOLATION = "VIOLATION"


class BrandGuidelines(BaseModel):
    """
    Brand guidelines configuration.
    All fields are optional and receive safe defaults when omitted.
    """
    model_config = ConfigDict(extra="ignore")

    brand_name: Optional[str] = None
    industry: Optional[str] = None
    personality: Optional[Union[str, List[str]]] = None
    tone: Optional[Union[str, List[str]]] = None
    approved_terms: List[str] = Field(default_factory=list)
    prohibited_terms: List[str] = Field(default_factory=list)
    approved_product_names: List[str] = Field(default_factory=list)
    additional_rules: List[str] = Field(default_factory=list)

    @field_validator(
        "approved_terms",
        "prohibited_terms",
        "approved_product_names",
        "additional_rules",
        mode="before",
    )
    @classmethod
    def normalize_list_fields(cls, v: Any) -> List[str]:
        if v is None:
            return []
        if isinstance(v, str):
            stripped = v.strip()
            return [stripped] if stripped else []
        if isinstance(v, (list, tuple, set)):
            return [str(item).strip() for item in v if item is not None and str(item).strip()]
        return v


class ApprovedFact(BaseModel):
    """
    An approved brand ground truth fact used for claim verification.
    """
    model_config = ConfigDict(extra="ignore")

    id: str
    claim: str
    evidence: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None

    @field_validator("id", mode="before")
    @classmethod
    def validate_id(cls, v: Any) -> str:
        if v is None:
            raise ValueError("ApprovedFact id is required.")
        s = str(v).strip()
        if not s:
            raise ValueError("ApprovedFact id must not be empty.")
        return s

    @field_validator("claim")
    @classmethod
    def validate_claim(cls, v: Any) -> str:
        if not isinstance(v, str) or not v.strip():
            raise ValueError("ApprovedFact claim must be a non-empty string.")
        return v.strip()


class AnalysisInput(BaseModel):
    """
    Input payload for brand content evaluation.
    Preserves original submitted content and safely defaults optional fields.
    """
    model_config = ConfigDict(extra="ignore")

    content: str
    brand_guidelines: BrandGuidelines = Field(default_factory=BrandGuidelines)
    approved_facts: List[ApprovedFact] = Field(default_factory=list)

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: Any) -> str:
        if not isinstance(v, str) or not v.strip():
            raise ValueError("Content must be a non-empty string.")
        # Preserve original submitted content exactly as provided
        return v

    @field_validator("brand_guidelines", mode="before")
    @classmethod
    def normalize_guidelines(cls, v: Any) -> Any:
        if v is None:
            return {}
        return v

    @field_validator("approved_facts", mode="before")
    @classmethod
    def normalize_facts(cls, v: Any) -> Any:
        if v is None:
            return []
        return v


class Finding(BaseModel):
    """
    Individual finding or issue identified during brand content analysis.
    """
    model_config = ConfigDict(use_enum_values=True, extra="ignore")

    finding_id: str
    category: FindingCategory
    severity: Severity
    status: FindingStatus
    original_text: str
    explanation: str
    violated_guideline: Optional[str] = None
    evidence: Optional[str] = None
    suggestion: Optional[str] = None
    confidence: Optional[float] = None

    @field_validator("finding_id", mode="before")
    @classmethod
    def validate_finding_id(cls, v: Any) -> str:
        if v is None or not str(v).strip():
            raise ValueError("Finding finding_id must not be empty.")
        return str(v)

    @field_validator("confidence")
    @classmethod
    def validate_confidence(cls, v: Optional[float]) -> Optional[float]:
        if v is not None:
            if not isinstance(v, (int, float)) or isinstance(v, bool):
                raise ValueError("Confidence must be a numeric value between 0.0 and 1.0.")
            if v < 0.0 or v > 1.0:
                raise ValueError(f"Confidence must be between 0.0 and 1.0, got {v}.")
            return float(v)
        return None


class AnalysisResponse(BaseModel):
    """
    Complete analysis result generated by the AI Engine.
    """
    model_config = ConfigDict(use_enum_values=True, extra="ignore")

    overall_status: OverallStatus
    summary: str
    findings: List[Finding] = Field(default_factory=list)
    corrected_content: Optional[str] = None

    @field_validator("findings", mode="before")
    @classmethod
    def normalize_findings(cls, v: Any) -> Any:
        if v is None:
            return []
        return v

    def to_dict(self) -> Dict[str, Any]:
        """Convert response to a clean, JSON-compatible Python dictionary."""
        return self.model_dump(mode="json")
