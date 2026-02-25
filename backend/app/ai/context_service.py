"""
Context Service Module

Orchestrates context detection and semantic search to provide
contextualized prompt suggestions based on input text.
"""

import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from app.ai.context_detector import ContextDetector, ContextDetectionResult, Domain, Subdomain
from app.ai.context_rules import ContextRules
from app.services.prompt_service import PromptService
from app.models.prompt import SemanticSearchResult, PromptListItem, PromptVersionResponse
from app.models.database import Prompt, PromptVersion

logger = logging.getLogger(__name__)


class ContextServiceResult:
    """Result of context service analysis."""
    
    def __init__(
        self,
        context: ContextDetectionResult,
        suggested_prompts: List[SemanticSearchResult],
        target_identifier: str
    ):
        self.context = context
        self.suggested_prompts = suggested_prompts
        self.target_identifier = target_identifier
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "context": {
                "domain": self.context.domain.value,
                "subdomain": self.context.subdomain.value,
                "confidence": round(self.context.confidence, 2)
            },
            "target_identifier": self.target_identifier,
            "suggested_prompts": [
                {
                    "prompt": {
                        "id": result.prompt.id,
                        "name": result.prompt.name,
                        "description": result.prompt.description,
                        "category": result.prompt.category,
                        "tags": result.prompt.tags,
                    },
                    "similarity": round(result.similarity, 4)
                }
                for result in self.suggested_prompts
            ],
            "total_suggestions": len(self.suggested_prompts)
        }


class ContextService:
    """
    Service that combines context detection with semantic search.
    
    Workflow:
    1. Receives text input
    2. Runs ContextDetector to identify domain/subdomain
    3. Performs semantic search to find relevant prompts
    4. Returns context + suggested prompts
    """
    
    def __init__(self):
        """Initialize ContextService."""
        self.context_detector = ContextDetector()
        self.prompt_service = PromptService()
    
    def analyze(
        self,
        db: Session,
        text: str,
        top_k: int = 5,
        min_similarity: float = 0.3
    ) -> ContextServiceResult:
        """
        Analyze text input and return context with suggested prompts.
        
        Args:
            db: Database session
            text: Input text to analyze
            top_k: Number of top prompts to return (default: 5)
            min_similarity: Minimum similarity threshold (default: 0.3)
            
        Returns:
            ContextServiceResult with context and suggested prompts
        """
        if not text or not text.strip():
            logger.warning("Empty text provided to ContextService.analyze")
            # Return empty result
            empty_context = ContextDetectionResult(
                domain=Domain.UNKNOWN,
                subdomain=Subdomain.UNKNOWN,
                confidence=0.0
            )
            return ContextServiceResult(
                context=empty_context,
                suggested_prompts=[],
                target_identifier=ContextRules.get_target_identifier(empty_context.domain)
            )
        
        # Step 1: Detect context
        logger.info(f"Detecting context for text (length: {len(text)})")
        context = self.context_detector.detect(text)
        logger.info(
            f"Context detected: domain={context.domain.value}, "
            f"subdomain={context.subdomain.value}, "
            f"confidence={context.confidence:.2f}"
        )
        
        # Step 2: Get target identifier from context rules
        target_identifier = ContextRules.get_target_identifier(context.domain)
        logger.info(f"Target identifier: {target_identifier}")
        
        # Step 3: Perform semantic search
        logger.info(f"Performing semantic search with top_k={top_k}")
        try:
            # semantic_search returns List[Tuple[Prompt, PromptVersion, float]]
            raw_results = PromptService.semantic_search(
                db=db,
                query=text,
                top_k=top_k
            )
            
            # Convert to SemanticSearchResult format
            search_results = []
            for prompt, version, similarity in raw_results:
                # Filter by minimum similarity threshold
                if similarity >= min_similarity:
                    # Convert Prompt to PromptListItem
                    prompt_item = PromptService._prompt_to_list_item(db, prompt)
                    
                    # Create SemanticSearchResult
                    search_results.append(SemanticSearchResult(
                        prompt=prompt_item,
                        version=PromptVersionResponse(
                            id=version.id,
                            prompt_id=version.prompt_id,
                            version=version.version,
                            content=version.content,
                            created_at=version.created_at,
                            improved_by=version.improved_by
                        ),
                        similarity=similarity
                    ))
            
            logger.info(
                f"Semantic search returned {len(raw_results)} results, "
                f"{len(search_results)} above threshold {min_similarity}"
            )
            
        except Exception as e:
            logger.error(f"Error during semantic search: {e}", exc_info=True)
            search_results = []
        
        # Step 4: Return combined result
        # Note: search_results is already filtered by similarity threshold
        return ContextServiceResult(
            context=context,
            suggested_prompts=search_results,
            target_identifier=target_identifier
        )
    
    def analyze_with_category_filter(
        self,
        db: Session,
        text: str,
        category: Optional[str] = None,
        top_k: int = 5,
        min_similarity: float = 0.3
    ) -> ContextServiceResult:
        """
        Analyze text with optional category filtering.
        
        Args:
            db: Database session
            text: Input text to analyze
            category: Optional category to filter results (e.g., "delphi", "oracle", "arquitetura")
            top_k: Number of top prompts to return (default: 5)
            min_similarity: Minimum similarity threshold (default: 0.3)
            
        Returns:
            ContextServiceResult with context and filtered suggested prompts
        """
        # Get base result
        result = self.analyze(db, text, top_k=top_k * 2, min_similarity=min_similarity)
        
        # Filter by category if provided
        if category:
            category_lower = category.lower()
            filtered_prompts = [
                prompt for prompt in result.suggested_prompts
                if prompt.prompt.category and prompt.prompt.category.lower() == category_lower
            ]
            
            # If we have filtered results, use them; otherwise keep original
            if filtered_prompts:
                result.suggested_prompts = filtered_prompts[:top_k]
                logger.info(f"Filtered to {len(result.suggested_prompts)} prompts in category '{category}'")
        
        return result
    
    def get_category_suggestion(self, text: str) -> Optional[str]:
        """
        Get suggested category based on text analysis.
        
        Args:
            text: Input text to analyze
            
        Returns:
            Suggested category string (e.g., "delphi", "oracle", "arquitetura") or None
        """
        category = self.context_detector.detect_category(text)
        if category:
            return category.value
        return None
