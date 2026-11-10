from typing import Optional
from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base, TimestampMixin, generate_uuid


class Terminology(Base, TimestampMixin):
    __tablename__ = "terminology"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    brand_id: Mapped[str] = mapped_column(String(36), ForeignKey("brands.id", ondelete="CASCADE"), index=True, nullable=False)
    term: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    term_type: Mapped[str] = mapped_column(String(50), nullable=False)  # APPROVED, PROHIBITED, PREFERRED
    preferred_replacement: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Reason / context
    is_case_sensitive: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    brand = relationship("Brand", back_populates="terminology")

