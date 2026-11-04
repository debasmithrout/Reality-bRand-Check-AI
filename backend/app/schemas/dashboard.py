from typing import List, Optional
from pydantic import BaseModel
from app.schemas.submission import SubmissionResponse


class ComplianceMetrics(BaseModel):
    average_compliance_score: float
    total_submissions: int
    pending_reviews: int
    approved_submissions: int
    rejected_submissions: int
    total_findings: int
    critical_findings: int


class DashboardSummaryResponse(BaseModel):
    metrics: ComplianceMetrics
    recent_submissions: List[SubmissionResponse] = []
    active_brands_count: int

