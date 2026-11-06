from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.finding import FindingResponse
from app.schemas.approval import ApprovalResponse


class SubmissionCreate(BaseModel):
    brand_id: str
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    channel: Optional[str] = "Blog"


class SubmissionUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = Field(None, min_length=1)
    channel: Optional[str] = None


class RevisionCreate(BaseModel):
    content: str = Field(..., min_length=1)
    changes_summary: Optional[str] = None


class RevisionResponse(BaseModel):
    id: str
    submission_id: str
    version: int
    content: str
    changes_summary: Optional[str] = None
    created_by: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SubmissionResponse(BaseModel):
    id: str
    brand_id: str
    workspace_id: str
    title: str
    content: str
    channel: Optional[str] = None
    status: str
    submitted_by: str
    compliance_score: Optional[float] = Field(None, ge=0.0, le=100.0)
    overall_status: Optional[str] = None  # COMPLIANT, FLAGGED, NON_COMPLIANT
    summary: Optional[str] = None
    corrected_content: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SubmissionDetailResponse(SubmissionResponse):
    findings: List[FindingResponse] = []
    revisions: List[RevisionResponse] = []
    approvals: List[ApprovalResponse] = []

    model_config = ConfigDict(from_attributes=True)


class AnalyzeRequest(BaseModel):
    force_reanalyze: Optional[bool] = False
