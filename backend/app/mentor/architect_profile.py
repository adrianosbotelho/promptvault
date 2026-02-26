"""
ArchitectProfile schemas and re-exports.

Stores the architect's profile: preferred patterns, recurring decisions,
common domains, risk tendencies, and optimization focus.
The SQLAlchemy model lives in app.models.database to avoid circular imports.
"""

from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel

# Re-export for convenience; model is defined in app.models.database
from app.models.database import ArchitectProfile  # noqa: F401


class ArchitectProfileBase(BaseModel):
    """Base schema for architect profile."""

    name: Optional[str] = None
    preferred_patterns: Optional[List[Any]] = None
    recurring_decisions: Optional[List[Any]] = None
    common_domains: Optional[List[Any]] = None
    risk_tendencies: Optional[List[Any]] = None
    optimization_focus: Optional[List[Any]] = None
    notes: Optional[str] = None


class ArchitectProfileCreate(ArchitectProfileBase):
    """Schema for creating an architect profile."""
    pass


class ArchitectProfileUpdate(BaseModel):
    """Schema for partial update of architect profile."""

    name: Optional[str] = None
    preferred_patterns: Optional[List[Any]] = None
    recurring_decisions: Optional[List[Any]] = None
    common_domains: Optional[List[Any]] = None
    risk_tendencies: Optional[List[Any]] = None
    optimization_focus: Optional[List[Any]] = None
    notes: Optional[str] = None


class ArchitectProfileResponse(ArchitectProfileBase):
    """Schema for architect profile response."""

    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
