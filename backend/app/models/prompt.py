from pydantic import BaseModel, model_validator, field_validator
from typing import Optional, List, Any
from datetime import datetime

from app.core.categories import PromptCategory, PromptTag


class PromptBase(BaseModel):
    name: str  # Required after validation
    description: Optional[str] = None
    category: Optional[PromptCategory] = None
    tags: Optional[List[PromptTag]] = None
    
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
    
    @field_validator('category', mode='before')
    @classmethod
    def validate_category(cls, v: Any) -> Optional[PromptCategory]:
        """Validate and convert category string to enum."""
        if v is None:
            return None
        
        # If already a PromptCategory enum, return as is
        if isinstance(v, PromptCategory):
            return v
        
        # If string, try to convert to enum
        if isinstance(v, str):
            v_lower = v.lower().strip()
            try:
                return PromptCategory(v_lower)
            except ValueError:
                valid_categories = [cat.value for cat in PromptCategory]
                raise ValueError(
                    f"Invalid category '{v}'. Must be one of: {', '.join(valid_categories)}"
                )
        
        raise ValueError(f"Category must be a string or PromptCategory enum, got {type(v)}")
    
    @field_validator('tags', mode='before')
    @classmethod
    def validate_tags(cls, v: Any) -> Optional[List[PromptTag]]:
        """Validate and convert tags list to PromptTag enums."""
        if v is None:
            return None
        
        if not isinstance(v, list):
            raise ValueError(f"Tags must be a list, got {type(v)}")
        
        valid_tags = []
        valid_tag_values = [tag.value for tag in PromptTag]
        
        for tag in v:
            # If already a PromptTag enum, use it
            if isinstance(tag, PromptTag):
                valid_tags.append(tag)
            # If string, try to convert to enum
            elif isinstance(tag, str):
                tag_lower = tag.lower().strip()
                try:
                    valid_tags.append(PromptTag(tag_lower))
                except ValueError:
                    raise ValueError(
                        f"Invalid tag '{tag}'. Must be one of: {', '.join(valid_tag_values)}"
                    )
            else:
                raise ValueError(f"Each tag must be a string or PromptTag enum, got {type(tag)}")
        
        # Remove duplicates while preserving order
        seen = set()
        unique_tags = []
        for tag in valid_tags:
            if tag not in seen:
                seen.add(tag)
                unique_tags.append(tag)
        
        return unique_tags
    
    class Config:
        populate_by_name = True


class PromptCreate(PromptBase):
    content: str  # Initial version content


class PromptUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None  # Alias for name
    description: Optional[str] = None
    category: Optional[PromptCategory] = None
    tags: Optional[List[PromptTag]] = None
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
    
    @field_validator('category', mode='before')
    @classmethod
    def validate_category(cls, v: Any) -> Optional[PromptCategory]:
        """Validate and convert category string to enum."""
        if v is None:
            return None
        
        # If already a PromptCategory enum, return as is
        if isinstance(v, PromptCategory):
            return v
        
        # If string, try to convert to enum
        if isinstance(v, str):
            v_lower = v.lower().strip()
            try:
                return PromptCategory(v_lower)
            except ValueError:
                valid_categories = [cat.value for cat in PromptCategory]
                raise ValueError(
                    f"Invalid category '{v}'. Must be one of: {', '.join(valid_categories)}"
                )
        
        raise ValueError(f"Category must be a string or PromptCategory enum, got {type(v)}")
    
    @field_validator('tags', mode='before')
    @classmethod
    def validate_tags(cls, v: Any) -> Optional[List[PromptTag]]:
        """Validate and convert tags list to PromptTag enums."""
        if v is None:
            return None
        
        if not isinstance(v, list):
            raise ValueError(f"Tags must be a list, got {type(v)}")
        
        valid_tags = []
        valid_tag_values = [tag.value for tag in PromptTag]
        
        for tag in v:
            # If already a PromptTag enum, use it
            if isinstance(tag, PromptTag):
                valid_tags.append(tag)
            # If string, try to convert to enum
            elif isinstance(tag, str):
                tag_lower = tag.lower().strip()
                try:
                    valid_tags.append(PromptTag(tag_lower))
                except ValueError:
                    raise ValueError(
                        f"Invalid tag '{tag}'. Must be one of: {', '.join(valid_tag_values)}"
                    )
            else:
                raise ValueError(f"Each tag must be a string or PromptTag enum, got {type(tag)}")
        
        # Remove duplicates while preserving order
        seen = set()
        unique_tags = []
        for tag in valid_tags:
            if tag not in seen:
                seen.add(tag)
                unique_tags.append(tag)
        
        return unique_tags
    
    class Config:
        populate_by_name = True


class PromptVersionResponse(BaseModel):
    id: int
    version: int
    content: str
    embedding: Optional[List[float]] = None  # Vector embedding with dimension 1536
    improved_by: Optional[str] = None  # Provider used to improve this version (e.g., GroqProvider, OpenAIProvider, MockLLMProvider)
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
    category: Optional[PromptCategory] = None
    tags: Optional[List[str]] = None  # Stored as strings in DB, can be converted to PromptTag if needed
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


class GroupedPromptsByCategory(BaseModel):
    """Prompts grouped by category."""
    category: Optional[str]  # None for prompts without category
    prompts: List[PromptListItem]
    count: int
    
    class Config:
        from_attributes = True


class GroupedPromptsByTag(BaseModel):
    """Prompts grouped by tag."""
    tag: str
    prompts: List[PromptListItem]
    count: int
    
    class Config:
        from_attributes = True


class GroupedPromptsResponse(BaseModel):
    """Response for grouped prompts endpoint."""
    by_category: List[GroupedPromptsByCategory]
    by_tag: List[GroupedPromptsByTag]
    total_prompts: int
    total_with_category: int
    total_with_tags: int
    
    class Config:
        from_attributes = True
