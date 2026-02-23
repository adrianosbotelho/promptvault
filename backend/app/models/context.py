"""
Context Analysis Models

Pydantic models for context analysis requests and responses.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from app.models.prompt import SemanticSearchResult


class ContextAnalyzeRequest(BaseModel):
    """Request model for context analysis."""
    text: str = Field(..., description="Text to analyze (code or description)", min_length=1)


class ContextAnalyzeResponse(BaseModel):
    """Response model for context analysis."""
    detected_mode: str = Field(..., description="Detected mode identifier (e.g., 'dev_oracle', 'dev_delphi', 'architecture')")
    confidence: float = Field(..., description="Confidence score between 0.0 and 1.0", ge=0.0, le=1.0)
    domain: str = Field(..., description="Detected domain (e.g., 'oracle', 'delphi', 'arquitetura')")
    subdomain: str = Field(..., description="Detected subdomain (e.g., 'implementation', 'debug', 'performance')")
    suggested_prompts: List[SemanticSearchResult] = Field(default_factory=list, description="List of suggested prompts based on semantic search")
    total_suggestions: int = Field(..., description="Total number of suggested prompts")
