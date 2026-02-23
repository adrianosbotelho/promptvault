"""
Worker configuration Pydantic schemas.
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime


class WorkerConfigBase(BaseModel):
    """Base worker configuration schema."""
    enabled: bool = Field(default=False, description="Enable/disable automatic background worker")
    interval_minutes: int = Field(default=5, ge=1, le=1440, description="Interval between analysis cycles in minutes")
    max_prompts: int = Field(default=5, ge=1, le=100, description="Maximum prompts to analyze per cycle")
    max_retries: int = Field(default=2, ge=0, le=10, description="Maximum retries per prompt")
    use_free_apis_only: bool = Field(default=True, description="Use only free APIs (Groq, HuggingFace, Mock)")


class WorkerConfigUpdate(WorkerConfigBase):
    """Schema for updating worker configuration."""
    pass


class WorkerConfigResponse(WorkerConfigBase):
    """Schema for worker configuration response."""
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
