from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict, Field


class ApprovedFactCreate(BaseModel):
    claim: str = Field(..., min_length=1)
    evidence: str = Field(..., min_length=1)
    source: Optional[str] = None
    approval_status: Optional[str] = "APPROVED"
    tags: Optional[Any] = None


class ApprovedFactUpdate(BaseModel):
    claim: Optional[str] = None
    evidence: Optional[str] = None
    source: Optional[str] = None
    approval_status: Optional[str] = None
    tags: Optional[Any] = None


class ApprovedFactResponse(BaseModel):
    id: str
    brand_id: str
    claim: str
    evidence: str
    source: Optional[str] = None
    approval_status: str
    tags: Optional[Any] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
