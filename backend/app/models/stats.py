"""
Statistics models for dashboard.
"""
from pydantic import BaseModel
from typing import Dict, Optional


class PromptStatsResponse(BaseModel):
    """Statistics about prompts."""
    total_prompts: int
    total_by_category: Dict[str, int]  # category -> count
    total_analyzed: int  # Prompts with insights
    total_improved: int  # Prompts with more than 1 version
    total_versions: int
    uncategorized_count: int
    
    class Config:
        from_attributes = True
