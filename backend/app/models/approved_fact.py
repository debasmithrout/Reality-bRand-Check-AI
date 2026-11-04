from typing import Any, Optional
from sqlalchemy import ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base, TimestampMixin, generate_uuid


class ApprovedFact(Base, TimestampMixin):
    __tablename__ = "approved_facts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    brand_id: Mapped[str] = mapped_column(String(36), ForeignKey("brands.id", ondelete="CASCADE"), index=True, nullable=False)
    claim: Mapped[str] = mapped_column(Text, nullable=False)  # The approved claim / fact
    evidence: Mapped[str] = mapped_column(Text, nullable=False)  # Supporting evidence / metrics
    source: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # URL or reference document
    approval_status: Mapped[str] = mapped_column(String(50), default="APPROVED", nullable=False)  # APPROVED, PENDING, DEPRECATED
    tags: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)  # Categorization tags

    # Relationships
    brand = relationship("Brand", back_populates="approved_facts")

