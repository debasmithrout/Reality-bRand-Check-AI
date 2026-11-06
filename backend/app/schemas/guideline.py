from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict


class GuidelineCreate(BaseModel):
    brand_personality: Optional[Any] = None  # e.g., ["Innovative", "Empowering", "Friendly"] or dict
    tone_of_voice: Optional[Any] = None  # e.g., {"dos": ["Be clear", "Be confident"], "donts": ["Jargon"]}
    messaging_rules: Optional[Any] = None  # e.g., {"core_values": [...], "positioning": "..."}
    additional_guidelines: Optional[str] = None


class GuidelineUpdate(BaseModel):
    brand_personality: Optional[Any] = None
    tone_of_voice: Optional[Any] = None
    messaging_rules: Optional[Any] = None
    additional_guidelines: Optional[str] = None


class GuidelineResponse(BaseModel):
    id: str
    brand_id: str
    brand_personality: Optional[Any] = None
    tone_of_voice: Optional[Any] = None
    messaging_rules: Optional[Any] = None
    additional_guidelines: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
