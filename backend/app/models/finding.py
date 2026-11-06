from typing import Optional
from sqlalchemy import Boolean, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base, TimestampMixin, generate_uuid


class Finding(Base, TimestampMixin):
    __tablename__ = "findings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    submission_id: Mapped[str] = mapped_column(String(36), ForeignKey("submissions.id", ondelete="CASCADE"), index=True, nullable=False)
    
    # Synthetic ID from AI engine (if provided by Salman's module, e.g. "F-001")
    ai_finding_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Category: TONE, TERMINOLOGY, CLAIM_VERIFICATION, BRAND_CONSISTENCY, GRAMMAR
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    # Severity: CRITICAL, WARNING, INFO
    severity: Mapped[str] = mapped_column(String(20), default="WARNING", nullable=False)
    
    # Canonical finding text + backward-compatible optional alias
    original_text: Mapped[str] = mapped_column(Text, nullable=False)
    matched_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    suggestion: Mapped[str] = mapped_column(Text, nullable=False)

    # Canonical guideline reference + backward-compatible alias
    violated_guideline: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    rule_reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Optional explainability evidence & AI confidence
    evidence: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # 0.0 to 1.0 (null if not provided)

    # Status: finding status from AI vs human editor resolution
    finding_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # e.g., FLAGGED, VIOLATION, INFO
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)  # Human editor resolution

    # Relationships
    submission = relationship("Submission", back_populates="findings")


