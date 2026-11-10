from typing import Any, Dict, Optional
from sqlalchemy import ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base, TimestampMixin, generate_uuid


class Guideline(Base, TimestampMixin):
    __tablename__ = "guidelines"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    brand_id: Mapped[str] = mapped_column(String(36), ForeignKey("brands.id", ondelete="CASCADE"), index=True, nullable=False)
    
    # Store structured guideline fields or JSON
    brand_personality: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)  # Traits, adjectives, values
    tone_of_voice: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)  # Tone rules, dos, don'ts
    messaging_rules: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)  # Value propositions, key messaging
    additional_guidelines: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    brand = relationship("Brand", back_populates="guidelines")

