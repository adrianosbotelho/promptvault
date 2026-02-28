"""
Architect Profile API endpoints.

GET  /profile  — return the current architect profile (creates default if none exists)
PUT  /profile  — update the architect profile
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from app.core.dependencies import get_db
from app.models.database import ArchitectProfile

router = APIRouter(prefix="/profile", tags=["profile"])


class ArchitectProfileResponse(BaseModel):
    id: int
    name: Optional[str] = None
    preferred_patterns: Optional[List[str]] = None
    recurring_decisions: Optional[List[str]] = None
    common_domains: Optional[List[str]] = None
    risk_tendencies: Optional[List[str]] = None
    optimization_focus: Optional[List[str]] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class ArchitectProfileUpdate(BaseModel):
    name: Optional[str] = None
    preferred_patterns: Optional[List[str]] = None
    recurring_decisions: Optional[List[str]] = None
    common_domains: Optional[List[str]] = None
    risk_tendencies: Optional[List[str]] = None
    optimization_focus: Optional[List[str]] = None
    notes: Optional[str] = None


def _get_or_create_profile(db: Session) -> ArchitectProfile:
    profile = db.query(ArchitectProfile).first()
    if not profile:
        profile = ArchitectProfile(name="default")
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.get("", response_model=ArchitectProfileResponse, status_code=status.HTTP_200_OK)
async def get_profile(db: Session = Depends(get_db)) -> ArchitectProfileResponse:
    """Return the architect profile, creating a default one if it does not exist."""
    return _get_or_create_profile(db)


@router.put("", response_model=ArchitectProfileResponse, status_code=status.HTTP_200_OK)
async def update_profile(
    data: ArchitectProfileUpdate,
    db: Session = Depends(get_db),
) -> ArchitectProfileResponse:
    """Update the architect profile fields (partial update — only provided fields are changed)."""
    profile = _get_or_create_profile(db)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile
