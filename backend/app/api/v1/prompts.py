from typing import List
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session, joinedload, defer
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from sqlalchemy import text
import logging

from app.core.dependencies import get_db
from app.models.prompt import (
    PromptCreate,
    PromptUpdate,
    PromptResponse,
    PromptListItem,
    PromptVersionResponse,
    SemanticSearchResult,
    GroupedPromptsResponse,
)
from app.models.database import Prompt, PromptVersion

logger = logging.getLogger(__name__)

from app.services.prompt_service import PromptService
from app.core.llm_provider import LLMProvider
from app.core.dependencies import get_llm_provider
from app.models.prompt_improvement import (
    PromptImprovementRequest,
    PromptImprovementResponse,
)
from app.services.prompt_improvement_service import PromptImprovementService

router = APIRouter(prefix="/prompts", tags=["prompts"])


def handle_db_error(e: Exception) -> HTTPException:
    """Handle database connection errors and return appropriate HTTP response."""
    if isinstance(e, OperationalError):
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection failed. Please check your DATABASE_URL configuration and ensure PostgreSQL is running."
        )
    elif isinstance(e, SQLAlchemyError):
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    else:
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        )


@router.post("", response_model=PromptResponse, status_code=status.HTTP_201_CREATED)
async def create_prompt(
    prompt_data: PromptCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new prompt with initial version.
    """
    try:
        prompt = PromptService.create_prompt(db, prompt_data)
        # Access versions to trigger lazy load
        _ = prompt.versions
        return prompt
    except HTTPException:
        raise
    except (OperationalError, SQLAlchemyError) as e:
        raise handle_db_error(e)
    except Exception as e:
        raise handle_db_error(e)


@router.get("", response_model=List[PromptListItem])
async def list_prompts(
    db: Session = Depends(get_db)
):
    """
    List all prompts with their latest version number.
    """
    try:
        return PromptService.list_prompts(db)
    except HTTPException:
        raise
    except (OperationalError, SQLAlchemyError) as e:
        raise handle_db_error(e)
    except Exception as e:
        raise handle_db_error(e)


@router.get("/grouped", response_model=GroupedPromptsResponse, status_code=status.HTTP_200_OK)
async def get_grouped_prompts(
    db: Session = Depends(get_db)
):
    """
    Get prompts grouped by category and tag.
    
    Returns:
        GroupedPromptsResponse with prompts organized by:
        - by_category: List of groups, each containing prompts for a category
        - by_tag: List of groups, each containing prompts with a specific tag
        - Statistics: total_prompts, total_with_category, total_with_tags
    """
    try:
        grouped = PromptService.get_grouped_prompts(db)
        return grouped
    except HTTPException:
        raise
    except (OperationalError, SQLAlchemyError) as e:
        raise handle_db_error(e)
    except Exception as e:
        raise handle_db_error(e)


@router.get("/search", response_model=List[SemanticSearchResult])
async def search_prompts(
    q: str,
    top_k: int = 5,
    db: Session = Depends(get_db)
):
    """
    Semantic search for prompts using embeddings.
    
    Args:
        q: Search query text
        top_k: Number of top results to return (default: 5)
    
    Returns:
        List of SemanticSearchResult with prompts and similarity scores
    """
    try:
        results = PromptService.semantic_search(db, q, top_k)
        
        # Convert to SemanticSearchResult format
        search_results = []
        for prompt, version, similarity in results:
            search_results.append(SemanticSearchResult(
                prompt=PromptListItem(
                    id=prompt.id,
                    name=prompt.name,
                    description=prompt.description,
                    category=prompt.category,
                    tags=prompt.tags,
                    created_at=prompt.created_at,
                    updated_at=prompt.updated_at,
                    latest_version=version.version
                ),
                similarity=similarity,
                matched_content=version.content[:200] + "..." if len(version.content) > 200 else version.content
            ))
        
        return search_results
    except HTTPException:
        raise
    except (OperationalError, SQLAlchemyError) as e:
        raise handle_db_error(e)
    except Exception as e:
        raise handle_db_error(e)


@router.get("/{prompt_id}", response_model=PromptResponse)
async def get_prompt(
    prompt_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a prompt by ID with all versions.
    """
    try:
        # Use joinedload to eagerly load versions
        # Defer embedding column to avoid vector type issues with SQLAlchemy
        prompt = db.query(Prompt).options(
            joinedload(Prompt.versions).defer(PromptVersion.embedding)
        ).filter(Prompt.id == prompt_id).first()
        
        if not prompt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Prompt with id {prompt_id} not found"
            )
        
        # Set embeddings to None - pgvector type cannot be easily converted to array
        # Embeddings are not needed for prompt display, only for semantic search
        for version in prompt.versions:
            version.embedding = None
        
        return prompt
    except HTTPException:
        raise
    except (OperationalError, SQLAlchemyError) as e:
        raise handle_db_error(e)
    except Exception as e:
        raise handle_db_error(e)


@router.put("/{prompt_id}", response_model=PromptResponse)
async def update_prompt(
    prompt_id: int,
    prompt_data: PromptUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a prompt. If content is provided, a new version is automatically created.
    """
    try:
        prompt = PromptService.update_prompt(db, prompt_id, prompt_data)
        
        # Reload prompt with versions, deferring embedding to avoid vector type issues
        prompt = db.query(Prompt).options(
            joinedload(Prompt.versions).defer(PromptVersion.embedding)
        ).filter(Prompt.id == prompt_id).first()
        
        if not prompt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Prompt with id {prompt_id} not found"
            )
        
        # Set embeddings to None - we don't need them for category/tag updates
        # The embedding column uses pgvector type which can't be easily converted to array
        # Since we're only updating metadata (category/tags), we can skip loading embeddings
        for version in prompt.versions:
            version.embedding = None
        
        return prompt
    except HTTPException:
        raise
    except (OperationalError, SQLAlchemyError) as e:
        raise handle_db_error(e)
    except Exception as e:
        raise handle_db_error(e)


@router.get("/{prompt_id}/versions", response_model=List[PromptVersionResponse])
async def get_prompt_versions(
    prompt_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all versions of a prompt.
    """
    try:
        prompt = PromptService.get_prompt(db, prompt_id)
        
        # Convert versions to response format
        versions = []
        for version in prompt.versions:
            # Skip loading embeddings - pgvector type cannot be easily converted
            # Embeddings are not needed for version history display
            embedding = None
            
            versions.append(PromptVersionResponse(
                id=version.id,
                version=version.version,
                content=version.content,
                embedding=embedding,
                created_at=version.created_at
            ))
        
        return sorted(versions, key=lambda v: v.version, reverse=True)
    except HTTPException:
        raise
    except (OperationalError, SQLAlchemyError) as e:
        raise handle_db_error(e)
    except Exception as e:
        raise handle_db_error(e)


@router.delete("/{prompt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_prompt(
    prompt_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a prompt and all its versions.
    """
    try:
        PromptService.delete_prompt(db, prompt_id)
        return None
    except HTTPException:
        raise
    except (OperationalError, SQLAlchemyError) as e:
        raise handle_db_error(e)
    except Exception as e:
        raise handle_db_error(e)


@router.post("/improve", response_model=PromptImprovementResponse)
async def improve_prompt(
    request: PromptImprovementRequest,
    llm_provider: LLMProvider = Depends(get_llm_provider),
    db: Session = Depends(get_db)
):
    """
    Improve a prompt using AI.
    """
    try:
        service = PromptImprovementService(provider=llm_provider)
        result = await service.improve_prompt(request.prompt)
        
        return PromptImprovementResponse(
            improved_prompt=result.improved_prompt,
            explanation=result.explanation
        )
    except HTTPException:
        raise
    except (OperationalError, SQLAlchemyError) as e:
        raise handle_db_error(e)
    except Exception as e:
        raise handle_db_error(e)
