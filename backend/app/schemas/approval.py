from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class ApprovalCreate(BaseModel):
    decision: str = Field(..., pattern="^(APPROVED|REJECTED|CHANGES_REQUESTED)$")
    comments: Optional[str] = None


class ApprovalResponse(BaseModel):
    id: str
    submission_id: str
    reviewer_id: str
    decision: str
    comments: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
