"""
Specialist API request/response schemas.
"""

from pydantic import BaseModel


class SpecialistBuildRequest(BaseModel):
    """Request for POST /specialist/build."""

    idea: str
    specialization: str


class SpecialistBuildResponse(BaseModel):
    """Response from POST /specialist/build."""

    markdown_prompt: str
    reasoning: str
    applied_specialist: str
