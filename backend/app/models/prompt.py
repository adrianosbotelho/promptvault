from pydantic import BaseModel, model_validator
from typing import Optional, List, Any
from datetime import datetime


class PromptBase(BaseModel):
    name: str  # Required after validation
    description: Optional[str] = None
    
    @model_validator(mode='before')
    @classmethod
    def validate_name_or_title(cls, data: Any) -> Any:
        """Accept either 'name' or 'title' field."""
        if isinstance(data, dict):
            # If 'title' is provided but 'name' is not, use 'title' as 'name'
            if 'title' in data and 'name' not in data:
                data = data.copy()
                data['name'] = data.pop('title')
        return data
    
    class Config:
        populate_by_name = True


class PromptCreate(PromptBase):
    content: str  # Initial version content


class PromptUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None  # Alias for name
    description: Optional[str] = None
    content: Optional[str] = None  # New version content if provided
    
    @model_validator(mode='before')
    @classmethod
    def validate_name_or_title(cls, data: Any) -> Any:
        """Accept either 'name' or 'title' field."""
        if isinstance(data, dict):
            # If 'title' is provided but 'name' is not, use 'title' as 'name'
            if 'title' in data and 'name' not in data:
                data = data.copy()
                data['name'] = data.pop('title')
        return data
    
    class Config:
        populate_by_name = True


class PromptVersionResponse(BaseModel):
    id: int
    version: int
    content: str
    embedding: Optional[List[float]] = None  # Vector embedding with dimension 1536
    created_at: datetime
    
    class Config:
        from_attributes = True


class PromptResponse(PromptBase):
    id: int
    created_at: datetime
    updated_at: datetime
    versions: List[PromptVersionResponse] = []
    
    class Config:
        from_attributes = True


class PromptListItem(BaseModel):
    """Simplified prompt for listing (without versions)."""
    id: int
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    latest_version: Optional[int] = None
    
    class Config:
        from_attributes = True


class SemanticSearchResult(BaseModel):
    """Result from semantic search."""
    prompt: PromptListItem
    version: PromptVersionResponse
    similarity: float  # Similarity score between 0.0 and 1.0
    
    class Config:
        from_attributes = True
