from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class TerminologyCreate(BaseModel):
    term: str = Field(..., min_length=1, max_length=255)
    term_type: str = Field(..., pattern="^(APPROVED|PROHIBITED|PREFERRED)$")
    preferred_replacement: Optional[str] = None
    description: Optional[str] = None
    is_case_sensitive: Optional[bool] = False


class TerminologyUpdate(BaseModel):
    term: Optional[str] = Field(None, min_length=1, max_length=255)
    term_type: Optional[str] = Field(None, pattern="^(APPROVED|PROHIBITED|PREFERRED)$")
    preferred_replacement: Optional[str] = None
    description: Optional[str] = None
    is_case_sensitive: Optional[bool] = None


class TerminologyResponse(BaseModel):
    id: str
    brand_id: str
    term: str
    term_type: str
    preferred_replacement: Optional[str] = None
    description: Optional[str] = None
    is_case_sensitive: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
