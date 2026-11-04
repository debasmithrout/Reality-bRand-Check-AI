from typing import Optional
from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base, TimestampMixin, generate_uuid


class Approval(Base, TimestampMixin):
    __tablename__ = "approvals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    submission_id: Mapped[str] = mapped_column(String(36), ForeignKey("submissions.id", ondelete="CASCADE"), index=True, nullable=False)
    reviewer_id: Mapped[str] = mapped_column(String(36), ForeignKey("profiles.id"), nullable=False)
    decision: Mapped[str] = mapped_column(String(50), nullable=False)  # APPROVED, REJECTED, CHANGES_REQUESTED
    comments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    submission = relationship("Submission", back_populates="approvals")
    reviewer = relationship("Profile", back_populates="approvals")

