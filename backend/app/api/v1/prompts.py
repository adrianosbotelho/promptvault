from typing import List
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import OperationalError, SQLAlchemyError

from app.core.dependencies import get_db
from app.models.prompt import (
    PromptCreate,
    PromptUpdate,
    PromptResponse,
    PromptListItem,
    PromptVersionResponse,
    SemanticSearchResult,
)
from app.models.database import Prompt, PromptVersion
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


@router.get("/search", response_model=List[SemanticSearchResult])
async def search_prompts(
    q: str,
    top_k: int = 5,
    db: Session = Depends(get_db)
):
    """
    Perform semantic search on prompts using cosine similarity.
    
    Args:
        q: Search query text
        top_k: Number of top results to return (default: 5, max: 20)
        
    Returns:
        List of search results with prompt, version, and similarity score
    """
    try:
        # Validate query parameter
        if not q or not q.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Query parameter 'q' cannot be empty"
            )
        
        # Limit top_k to reasonable range
        top_k = min(max(1, top_k), 20)
        
        # Perform semantic search
        results = PromptService.semantic_search(db, q.strip(), top_k=top_k)
        
        # Convert results to response format
        search_results = []
        for prompt, version, similarity in results:
            # Create PromptListItem from Prompt
            prompt_item = PromptListItem(
                id=prompt.id,
                name=prompt.name,
                description=prompt.description,
                created_at=prompt.created_at,
                updated_at=prompt.updated_at,
                latest_version=version.version
            )
            
            # Create PromptVersionResponse from PromptVersion
            version_response = PromptVersionResponse(
                id=version.id,
                version=version.version,
                content=version.content,
                embedding=version.embedding,
                created_at=version.created_at
            )
            
            search_results.append(SemanticSearchResult(
                prompt=prompt_item,
                version=version_response,
                similarity=similarity
            ))
        
        return search_results
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
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
        prompt = db.query(Prompt).options(
            joinedload(Prompt.versions)
        ).filter(Prompt.id == prompt_id).first()
        
        if not prompt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Prompt with id {prompt_id} not found"
            )
        
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
        # Access versions to trigger lazy load
        _ = prompt.versions
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
    Get all versions of a specific prompt.
    """
    try:
        # Verify prompt exists
        prompt = PromptService.get_prompt(db, prompt_id)
        
        # Get all versions ordered by version number
        versions = db.query(PromptVersion).filter(
            PromptVersion.prompt_id == prompt_id
        ).order_by(PromptVersion.version.asc()).all()
        
        return versions
    except HTTPException:
        raise
    except (OperationalError, SQLAlchemyError) as e:
        raise handle_db_error(e)
    except Exception as e:
        raise handle_db_error(e)


@router.post(
    "/improve",
    response_model=PromptImprovementResponse,
    status_code=status.HTTP_200_OK
)
async def improve_prompt(
    request: PromptImprovementRequest,
    provider: LLMProvider = Depends(get_llm_provider)
):
    """
    Improve a prompt using AI.
    
    This endpoint uses the configured LLM provider (default: OpenAI) to improve
    the structure and clarity of a prompt without changing its intent.
    
    Args:
        request: Prompt improvement request containing the original prompt
        
    Returns:
        PromptImprovementResponse with improved_prompt and explanation
    """
    try:
        service = PromptImprovementService(provider=provider)
        result = await service.improve_prompt(request.prompt)
        return PromptImprovementResponse.from_result(result)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.exception(f"Error improving prompt: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error improving prompt: {str(e)}"
        )
