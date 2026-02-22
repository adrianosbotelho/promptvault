"""
Agent Context Builder.

Builds context for AI agents by gathering:
- Current prompt
- Similar prompts from semantic search
- Latest prompt versions
"""
from typing import List, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.database import Prompt, PromptVersion
from app.models.prompt import PromptResponse, PromptVersionResponse
from app.services.prompt_service import PromptService


class SimilarPrompt(BaseModel):
    """Similar prompt found via semantic search."""
    prompt: PromptResponse
    similarity: float  # Similarity score between 0.0 and 1.0
    
    class Config:
        from_attributes = True


class AgentContext(BaseModel):
    """Context for AI agents working with prompts."""
    current_prompt: Optional[PromptResponse] = None
    similar_prompts: List[SimilarPrompt] = []
    latest_prompts: List[PromptResponse] = []
    
    class Config:
        from_attributes = True


class AgentContextBuilder:
    """Builder for creating AgentContext instances."""
    
    def __init__(self, db: Session):
        """
        Initialize the builder.
        
        Args:
            db: Database session
        """
        self.db = db
        self._current_prompt_id: Optional[int] = None
        self._similar_prompts_count: int = 5
        self._latest_prompts_count: int = 10
    
    def with_current_prompt(self, prompt_id: int) -> 'AgentContextBuilder':
        """
        Set the current prompt to include in context.
        
        Args:
            prompt_id: ID of the current prompt
            
        Returns:
            Self for method chaining
        """
        self._current_prompt_id = prompt_id
        return self
    
    def with_similar_prompts(self, count: int = 5) -> 'AgentContextBuilder':
        """
        Configure how many similar prompts to include.
        
        Args:
            count: Number of similar prompts to fetch (default: 5)
            
        Returns:
            Self for method chaining
        """
        self._similar_prompts_count = count
        return self
    
    def with_latest_prompts(self, count: int = 10) -> 'AgentContextBuilder':
        """
        Configure how many latest prompts to include.
        
        Args:
            count: Number of latest prompts to fetch (default: 10)
            
        Returns:
            Self for method chaining
        """
        self._latest_prompts_count = count
        return self
    
    def build(self) -> AgentContext:
        """
        Build the AgentContext with all configured data.
        
        Returns:
            AgentContext with current prompt, similar prompts, and latest prompts
        """
        context = AgentContext()
        
        # Get current prompt if specified
        if self._current_prompt_id:
            context.current_prompt = self._get_current_prompt(self._current_prompt_id)
            
            # Get similar prompts based on current prompt content
            if context.current_prompt and context.current_prompt.versions:
                latest_version = max(
                    context.current_prompt.versions,
                    key=lambda v: v.version
                )
                if latest_version.content:
                    context.similar_prompts = self._get_similar_prompts(
                        latest_version.content,
                        exclude_prompt_id=self._current_prompt_id
                    )
        
        # Get latest prompts
        context.latest_prompts = self._get_latest_prompts()
        
        return context
    
    def _get_current_prompt(self, prompt_id: int) -> Optional[PromptResponse]:
        """Get the current prompt by ID."""
        try:
            prompt = PromptService.get_prompt(self.db, prompt_id)
            
            # Load versions
            versions = self.db.query(PromptVersion).filter(
                PromptVersion.prompt_id == prompt_id
            ).order_by(PromptVersion.version.asc()).all()
            
            # Convert to response format
            version_responses = [
                PromptVersionResponse(
                    id=v.id,
                    version=v.version,
                    content=v.content,
                    embedding=v.embedding,
                    created_at=v.created_at
                )
                for v in versions
            ]
            
            return PromptResponse(
                id=prompt.id,
                name=prompt.name,
                description=prompt.description,
                created_at=prompt.created_at,
                updated_at=prompt.updated_at,
                versions=version_responses
            )
        except Exception:
            return None
    
    def _get_similar_prompts(
        self,
        query: str,
        exclude_prompt_id: Optional[int] = None
    ) -> List[SimilarPrompt]:
        """Get similar prompts using semantic search."""
        try:
            # Perform semantic search
            results = PromptService.semantic_search(
                self.db,
                query,
                top_k=self._similar_prompts_count + (1 if exclude_prompt_id else 0)
            )
            
            similar_prompts = []
            for prompt, version, similarity in results:
                # Skip the excluded prompt
                if exclude_prompt_id and prompt.id == exclude_prompt_id:
                    continue
                
                # Get all versions for this prompt
                versions = self.db.query(PromptVersion).filter(
                    PromptVersion.prompt_id == prompt.id
                ).order_by(PromptVersion.version.asc()).all()
                
                version_responses = [
                    PromptVersionResponse(
                        id=v.id,
                        version=v.version,
                        content=v.content,
                        embedding=v.embedding,
                        created_at=v.created_at
                    )
                    for v in versions
                ]
                
                prompt_response = PromptResponse(
                    id=prompt.id,
                    name=prompt.name,
                    description=prompt.description,
                    created_at=prompt.created_at,
                    updated_at=prompt.updated_at,
                    versions=version_responses
                )
                
                similar_prompts.append(SimilarPrompt(
                    prompt=prompt_response,
                    similarity=similarity
                ))
                
                # Stop when we have enough
                if len(similar_prompts) >= self._similar_prompts_count:
                    break
            
            return similar_prompts
        except Exception:
            return []
    
    def _get_latest_prompts(self) -> List[PromptResponse]:
        """Get the latest prompts."""
        try:
            # Get list of prompts
            prompt_list = PromptService.list_prompts(self.db)
            
            # Sort by updated_at descending and take top N
            sorted_prompts = sorted(
                prompt_list,
                key=lambda p: p.updated_at,
                reverse=True
            )[:self._latest_prompts_count]
            
            # Convert to full PromptResponse with versions
            latest_prompts = []
            for prompt_item in sorted_prompts:
                prompt = self.db.query(Prompt).filter(
                    Prompt.id == prompt_item.id
                ).first()
                
                if prompt:
                    versions = self.db.query(PromptVersion).filter(
                        PromptVersion.prompt_id == prompt.id
                    ).order_by(PromptVersion.version.asc()).all()
                    
                    version_responses = [
                        PromptVersionResponse(
                            id=v.id,
                            version=v.version,
                            content=v.content,
                            embedding=v.embedding,
                            created_at=v.created_at
                        )
                        for v in versions
                    ]
                    
                    latest_prompts.append(PromptResponse(
                        id=prompt.id,
                        name=prompt.name,
                        description=prompt.description,
                        created_at=prompt.created_at,
                        updated_at=prompt.updated_at,
                        versions=version_responses
                    ))
            
            return latest_prompts
        except Exception:
            return []
