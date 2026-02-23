"""
Context Analysis API Router

Provides endpoints for context detection and prompt suggestions.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError, SQLAlchemyError

from app.core.dependencies import get_db
from app.ai.context_service import ContextService
from app.models.context import ContextAnalyzeRequest, ContextAnalyzeResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/context", tags=["context"])


def handle_db_error(e: Exception) -> HTTPException:
    """Handle database errors and return appropriate HTTP exception."""
    if isinstance(e, OperationalError):
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection failed. Please check your DATABASE_URL configuration and ensure PostgreSQL is running."
        )
    else:
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@router.post("/analyze", response_model=ContextAnalyzeResponse)
async def analyze_context(
    request: ContextAnalyzeRequest,
    db: Session = Depends(get_db)
):
    """
    Analyze text input and return context detection with suggested prompts.
    
    Args:
        request: ContextAnalyzeRequest with text to analyze
        db: Database session
        
    Returns:
        ContextAnalyzeResponse with:
        - detected_mode: Target identifier (e.g., "dev_oracle", "dev_delphi", "architecture")
        - confidence: Confidence score (0.0 to 1.0)
        - domain: Detected domain
        - subdomain: Detected subdomain
        - suggested_prompts: List of relevant prompts from semantic search
        - total_suggestions: Number of suggested prompts
    """
    try:
        if not request.text or not request.text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text cannot be empty"
            )
        
        # Initialize context service
        context_service = ContextService()
        
        # Analyze text
        logger.info(f"Analyzing context for text (length: {len(request.text)})")
        result = context_service.analyze(
            db=db,
            text=request.text,
            top_k=5,
            min_similarity=0.3
        )
        
        # Build response
        response = ContextAnalyzeResponse(
            detected_mode=result.target_identifier,
            confidence=round(result.context.confidence, 2),
            domain=result.context.domain.value,
            subdomain=result.context.subdomain.value,
            suggested_prompts=result.suggested_prompts,
            total_suggestions=len(result.suggested_prompts)
        )
        
        logger.info(
            f"Context analysis completed: mode={response.detected_mode}, "
            f"confidence={response.confidence}, suggestions={response.total_suggestions}"
        )
        
        return response
        
    except HTTPException:
        raise
    except (OperationalError, SQLAlchemyError) as e:
        raise handle_db_error(e)
    except Exception as e:
        logger.exception(f"Error analyzing context: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing context: {str(e)}"
        )
