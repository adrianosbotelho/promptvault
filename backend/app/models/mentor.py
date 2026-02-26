"""
Mentor-related Pydantic models.

Defines request/response schemas for the mentor review API and summary.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class MentorReviewRequest(BaseModel):
    """Input for /mentor/review."""

    text: str


class MentorReviewResponse(BaseModel):
    """Output for /mentor/review."""

    mentor_advice: str
    architect_observation: str
    risk_alert: str


class MentorSummaryItem(BaseModel):
    """Single item in mentor summary (observation, alert, or pattern)."""

    text: str
    prompt_id: Optional[int] = None
    prompt_name: Optional[str] = None
    created_at: Optional[datetime] = None


class MentorSummaryResponse(BaseModel):
    """Output for GET /mentor/summary: observations, alerts, patterns from recent insights."""

    recent_observations: List[MentorSummaryItem] = []
    architectural_alerts: List[MentorSummaryItem] = []
    detected_patterns: List[MentorSummaryItem] = []

