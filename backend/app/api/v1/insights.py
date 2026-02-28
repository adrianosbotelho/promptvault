"""
Insights API endpoints.

Endpoints for managing insights (AI agent analysis results).
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError, SQLAlchemyError

from app.core.dependencies import get_db
from app.models.insight import InsightResponse, InsightListItem
from app.services.insight_service import InsightService

router = APIRouter(prefix="/insights", tags=["insights"])


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


@router.get("", response_model=List[InsightListItem], status_code=status.HTTP_200_OK)
async def list_insights(
    prompt_id: Optional[int] = Query(None, description="Filter by prompt ID"),
    unread_only: bool = Query(False, description="Only return unread insights"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    db: Session = Depends(get_db)
):
    """
    List insights with optional filtering.
    
    Query parameters:
    - prompt_id: Filter insights by prompt ID
    - unread_only: If true, only return unread insights
    - limit: Maximum number of results (1-1000, default: 100)
    - offset: Number of results to skip (default: 0)
    
    Returns:
        List of InsightListItem
    """
    try:
        insights = InsightService.list_insights(
            db=db,
            prompt_id=prompt_id,
            limit=limit,
            offset=offset,
            unread_only=unread_only
        )
        return insights
    except HTTPException:
        raise
    except (OperationalError, SQLAlchemyError) as e:
        raise handle_db_error(e)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.exception(f"Error listing insights: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing insights: {str(e)}"
        )


@router.get("/{insight_id}", response_model=InsightResponse, status_code=status.HTTP_200_OK)
async def get_insight(
    insight_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a single insight by ID (includes full content: improvement_ideas, reusable_patterns, warnings).
    """
    try:
        return InsightService.get_insight(db, insight_id)
    except HTTPException:
        raise
    except (OperationalError, SQLAlchemyError) as e:
        raise handle_db_error(e)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.exception(f"Error fetching insight: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching insight: {str(e)}"
        )


@router.post("/{insight_id}/read", response_model=InsightResponse, status_code=status.HTTP_200_OK)
async def mark_insight_as_read(
    insight_id: int,
    db: Session = Depends(get_db)
):
    """
    Mark an insight as read.
    
    Args:
        insight_id: ID of the insight to mark as read
        
    Returns:
        Updated InsightResponse
    """
    try:
        insight = InsightService.mark_as_read(db, insight_id)
        return insight
    except HTTPException:
        raise
    except (OperationalError, SQLAlchemyError) as e:
        raise handle_db_error(e)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.exception(f"Error marking insight as read: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error marking insight as read: {str(e)}"
        )
