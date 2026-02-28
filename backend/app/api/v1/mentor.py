"""
Mentor API endpoints.

Provides mentor review and summary for the Architect Mentor dashboard panel.
"""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_llm_provider
from app.core.llm_provider import LLMProvider
from app.models.mentor import MentorReviewRequest, MentorReviewResponse, MentorSummaryResponse
from app.mentor.review_service import MentorReviewService
from app.mentor.mentor_summary_service import get_mentor_summary

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mentor", tags=["mentor"])


@router.get(
    "/summary",
    response_model=MentorSummaryResponse,
    status_code=status.HTTP_200_OK,
)
async def mentor_summary(
    domain: Optional[str] = Query(default=None, description="Filter by domain: delphi, oracle, arquitetura"),
    db: Session = Depends(get_db),
) -> MentorSummaryResponse:
    """
    Get mentor summary for the dashboard: recent observations,
    architectural alerts, and detected patterns from insights.
    Optionally filter by domain (e.g. delphi, oracle).
    """
    return get_mentor_summary(db, domain=domain)


@router.post(
    "/review",
    response_model=MentorReviewResponse,
    status_code=status.HTTP_200_OK,
)
async def mentor_review(
    request: MentorReviewRequest,
    llm_provider: LLMProvider = Depends(get_llm_provider),
) -> MentorReviewResponse:
    """
    Review a technical problem description and return mentor advice,
    an architectural observation, and any risk alerts.
    """
    if not request.text or not request.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text cannot be empty",
        )

    service = MentorReviewService(llm_provider=llm_provider)
    logger.info("Handling mentor review request")
    return await service.review(request.text)

