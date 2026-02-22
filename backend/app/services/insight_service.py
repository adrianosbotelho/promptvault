"""
Insight Service.

Service for managing insights (AI agent analysis results).
"""
from typing import List, Optional
from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.database import Insight, Prompt
from app.models.insight import InsightListItem


class InsightService:
    """Service for managing insights."""
    
    @staticmethod
    def list_insights(
        db: Session,
        prompt_id: Optional[int] = None,
        limit: int = 100,
        offset: int = 0,
        unread_only: bool = False
    ) -> List[InsightListItem]:
        """
        List insights with optional filtering.
        
        Args:
            db: Database session
            prompt_id: Optional filter by prompt ID
            limit: Maximum number of results
            offset: Number of results to skip
            unread_only: If True, only return unread insights
            
        Returns:
            List of InsightListItem
        """
        query = db.query(Insight)
        
        # Filter by prompt_id if provided
        if prompt_id:
            query = query.filter(Insight.prompt_id == prompt_id)
        
        # Filter unread only if requested
        if unread_only:
            query = query.filter(Insight.read_at.is_(None))
        
        # Order by created_at descending (newest first)
        query = query.order_by(desc(Insight.created_at))
        
        # Apply pagination
        insights = query.offset(offset).limit(limit).all()
        
        # Convert to InsightListItem
        result = []
        for insight in insights:
            improvement_count = len(insight.improvement_ideas) if insight.improvement_ideas else 0
            pattern_count = len(insight.reusable_patterns) if insight.reusable_patterns else 0
            warning_count = len(insight.warnings) if insight.warnings else 0
            
            result.append(InsightListItem(
                id=insight.id,
                prompt_id=insight.prompt_id,
                created_at=insight.created_at,
                read_at=insight.read_at,
                improvement_count=improvement_count,
                pattern_count=pattern_count,
                warning_count=warning_count,
                is_read=insight.read_at is not None
            ))
        
        return result
    
    @staticmethod
    def get_insight(db: Session, insight_id: int) -> Insight:
        """
        Get an insight by ID.
        
        Args:
            db: Database session
            insight_id: ID of the insight
            
        Returns:
            Insight model
            
        Raises:
            HTTPException: If insight not found
        """
        insight = db.query(Insight).filter(Insight.id == insight_id).first()
        
        if not insight:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Insight with id {insight_id} not found"
            )
        
        return insight
    
    @staticmethod
    def mark_as_read(db: Session, insight_id: int) -> Insight:
        """
        Mark an insight as read.
        
        Args:
            db: Database session
            insight_id: ID of the insight
            
        Returns:
            Updated Insight model
            
        Raises:
            HTTPException: If insight not found
        """
        insight = InsightService.get_insight(db, insight_id)
        
        # Only update if not already read
        if insight.read_at is None:
            insight.read_at = datetime.utcnow()
            db.commit()
            db.refresh(insight)
        
        return insight
