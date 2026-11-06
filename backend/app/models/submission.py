from typing import Any, List, Optional
from sqlalchemy import Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base, TimestampMixin, generate_uuid


class Submission(Base, TimestampMixin):
    __tablename__ = "submissions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    brand_id: Mapped[str] = mapped_column(String(36), ForeignKey("brands.id", ondelete="CASCADE"), index=True, nullable=False)
    workspace_id: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    channel: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # Blog, Social Media, Email, Ad, Press Release
    
    # State machine: DRAFT -> SUBMITTED -> ANALYZING -> NEEDS_REVIEW -> APPROVED / REJECTED
    status: Mapped[str] = mapped_column(String(50), default="DRAFT", index=True, nullable=False)
    
    submitted_by: Mapped[str] = mapped_column(String(36), ForeignKey("profiles.id"), nullable=False)
    compliance_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # 0.0 to 100.0
    overall_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # COMPLIANT, FLAGGED, NON_COMPLIANT
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # AI summary
    corrected_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # AI suggested full copy

    # Relationships
    brand = relationship("Brand", back_populates="submissions")
    author = relationship("Profile", back_populates="submissions")
    findings = relationship("Finding", back_populates="submission", cascade="all, delete-orphan")
    revisions = relationship("Revision", back_populates="submission", cascade="all, delete-orphan")
    approvals = relationship("Approval", back_populates="submission", cascade="all, delete-orphan")

