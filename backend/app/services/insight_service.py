"""
Insight Service.

Service for managing insights (AI agent analysis results).
"""
from typing import List, Optional
from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, text

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
        List insights — uses SQL JSON length functions to avoid loading full JSON blobs.
        """
        filters = []
        params: dict = {"limit": limit, "offset": offset}

        if prompt_id is not None:
            filters.append("prompt_id = :prompt_id")
            params["prompt_id"] = prompt_id

        if unread_only:
            filters.append("read_at IS NULL")

        where_clause = ("WHERE " + " AND ".join(filters)) if filters else ""

        rows = db.execute(text(f"""
            SELECT
                id,
                prompt_id,
                created_at,
                read_at,
                COALESCE(jsonb_array_length(improvement_ideas::jsonb), 0)  AS improvement_count,
                COALESCE(jsonb_array_length(reusable_patterns::jsonb), 0)  AS pattern_count,
                COALESCE(jsonb_array_length(warnings::jsonb), 0)           AS warning_count
            FROM insights
            {where_clause}
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
        """), params).fetchall()

        return [
            InsightListItem(
                id=row.id,
                prompt_id=row.prompt_id,
                created_at=row.created_at,
                read_at=row.read_at,
                improvement_count=int(row.improvement_count),
                pattern_count=int(row.pattern_count),
                warning_count=int(row.warning_count),
                is_read=row.read_at is not None,
            )
            for row in rows
        ]
    
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
