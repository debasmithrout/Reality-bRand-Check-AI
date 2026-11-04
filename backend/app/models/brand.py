from typing import List, Optional
from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base, TimestampMixin, generate_uuid


class Brand(Base, TimestampMixin):
    __tablename__ = "brands"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    workspace_id: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    industry: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("profiles.id"), nullable=False)

    # Relationships
    creator = relationship("Profile", back_populates="brands")
    guidelines = relationship("Guideline", back_populates="brand", cascade="all, delete-orphan")
    terminology = relationship("Terminology", back_populates="brand", cascade="all, delete-orphan")
    approved_facts = relationship("ApprovedFact", back_populates="brand", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="brand", cascade="all, delete-orphan")

