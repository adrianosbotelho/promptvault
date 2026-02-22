"""
Agent API endpoints.

Endpoints for AI agent functionality including prompt analysis.
"""
from typing import Optional
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError, SQLAlchemyError

from app.core.dependencies import get_db, get_llm_provider
from app.core.llm_provider import LLMProvider
from app.agent.agent_service import AgentService, AgentSuggestions
from app.services.prompt_service import PromptService

router = APIRouter(prefix="/agent", tags=["agent"])


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


@router.post(
    "/analyze/{prompt_id}",
    response_model=AgentSuggestions,
    status_code=status.HTTP_200_OK
)
async def analyze_prompt(
    prompt_id: int,
    user_query: Optional[str] = None,
    similar_count: int = 5,
    latest_count: int = 10,
    db: Session = Depends(get_db),
    llm_provider: LLMProvider = Depends(get_llm_provider)
):
    """
    Analyze a prompt and get structured suggestions.
    
    This endpoint uses the AI agent to analyze a prompt and provide:
    - Improvement ideas
    - Reusable patterns
    - Warnings
    
    Args:
        prompt_id: ID of the prompt to analyze
        user_query: Optional custom query/request (defaults to standard analysis)
        similar_count: Number of similar prompts to include in context (default: 5)
        latest_count: Number of latest prompts to include in context (default: 10)
        
    Returns:
        AgentSuggestions with improvement_ideas, reusable_patterns, and warnings
    """
    try:
        # Verify prompt exists
        PromptService.get_prompt(db, prompt_id)
        
        # Initialize agent service
        agent_service = AgentService(db, llm_provider=llm_provider)
        
        # Default query if not provided
        if not user_query:
            user_query = (
                "Analyze this prompt and provide suggestions for improvements, "
                "reusable patterns that could be applied, and any warnings about "
                "potential issues or missing instructions."
            )
        
        # Get suggestions
        suggestions = await agent_service.get_suggestions(
            prompt_id=prompt_id,
            user_query=user_query,
            similar_count=similar_count,
            latest_count=latest_count
        )
        
        return suggestions
        
    except HTTPException:
        raise
    except (OperationalError, SQLAlchemyError) as e:
        raise handle_db_error(e)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.exception(f"Error analyzing prompt: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing prompt: {str(e)}"
        )
