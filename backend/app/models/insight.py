"""
Insight Pydantic models.

Schemas for Insight-related data validation and serialization.
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class InsightBase(BaseModel):
    """Base insight model."""
    prompt_id: int
    improvement_ideas: Optional[List[Dict[str, Any]]] = None
    reusable_patterns: Optional[List[Dict[str, Any]]] = None
    warnings: Optional[List[Dict[str, Any]]] = None


class InsightCreate(InsightBase):
    """Schema for creating an insight."""
    pass


class InsightResponse(InsightBase):
    """Schema for insight response."""
    id: int
    created_at: datetime
    read_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class InsightListItem(BaseModel):
    """Simplified insight for listing."""
    id: int
    prompt_id: int
    created_at: datetime
    read_at: Optional[datetime] = None
    improvement_count: int = 0
    pattern_count: int = 0
    warning_count: int = 0
    is_read: bool = False
    
    class Config:
        from_attributes = True
