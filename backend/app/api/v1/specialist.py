"""
Specialist API endpoints.

POST /specialist/build: simple idea + specialization → professional prompt (via PromptRefiner + LLM).
POST /specialist/feedback: record user feedback (useful/not useful) for the LearningEngine.

Pipeline:
  IDEIA SIMPLES → PromptRefiner → LLM → PROMPT PROFISSIONAL → user copies → uses in GPT/Claude/Cursor.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.dependencies import get_llm_provider
from app.core.llm_provider import LLMProvider
from app.models.specialist import SpecialistBuildRequest, SpecialistBuildResponse
from app.specialist.prompt_refiner import PromptRefiner
from app.specialist.specialization_registry import SPECIALISTS
from app.specialist.learning_engine import LearningEngine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/specialist", tags=["specialist"])


@router.post(
    "/build",
    response_model=SpecialistBuildResponse,
    status_code=status.HTTP_200_OK,
)
async def specialist_build(
    request: SpecialistBuildRequest,
    llm_provider: LLMProvider = Depends(get_llm_provider),
) -> SpecialistBuildResponse:
    """
    Simple idea → professional structured prompt (Markdown) ready to copy and use in any LLM.
    Uses PromptRefiner (REFINEMENT_STANDARD + specialist mindset) to transform the raw idea.
    """
    idea = (request.idea or "").strip()
    if not idea:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="idea cannot be empty",
        )
    spec_id = (request.specialization or "").strip().lower()
    if not spec_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="specialization cannot be empty",
        )

    if spec_id not in SPECIALISTS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Specialization not found: {request.specialization}. Available: {', '.join(sorted(SPECIALISTS.keys()))}",
        )

    specialist = SPECIALISTS[spec_id]
    refiner = PromptRefiner()

    reasoning = "Professional prompt not generated (LLM provider may not support chat)."
    try:
        professional_prompt = await refiner.build_async(idea, spec_id, llm_provider)
        if callable(getattr(llm_provider, "chat", None)):
            reasoning = (
                f"Refined with **{specialist.name}** specialist via two-step pipeline "
                "(expand context → build structured prompt). "
                "Ready to copy and use in GPT/Claude/Cursor."
            )
        else:
            reasoning = "LLM provider unavailable — prompt template returned without refinement."
    except Exception as e:
        logger.warning("PromptRefiner build_async failed: %s", e)
        fallback = refiner.build(idea, spec_id)
        professional_prompt = fallback["user"].strip()
        reasoning = f"Pipeline failed ({e}); fallback template returned."

    return SpecialistBuildResponse(
        markdown_prompt=professional_prompt,
        reasoning=reasoning,
        applied_specialist=specialist.name,
    )


class SpecialistFeedbackRequest(BaseModel):
    specialization: str
    useful: bool


class SpecialistFeedbackResponse(BaseModel):
    recorded: bool
    message: str


@router.post(
    "/feedback",
    response_model=SpecialistFeedbackResponse,
    status_code=status.HTTP_200_OK,
)
async def specialist_feedback(request: SpecialistFeedbackRequest) -> SpecialistFeedbackResponse:
    """
    Record user feedback (useful / not useful) for a generated prompt.
    Feeds the LearningEngine so future suggestions can improve over time.
    """
    spec_id = (request.specialization or "").strip().lower()
    if not spec_id or spec_id not in SPECIALISTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown specialization: {request.specialization}",
        )
    try:
        engine = LearningEngine.get_default()
        engine.record(
            specialization_id=spec_id,
            template_id="refiner",
            success=request.useful,
        )
        logger.info("Feedback recorded: spec=%s useful=%s", spec_id, request.useful)
        return SpecialistFeedbackResponse(recorded=True, message="Feedback registrado.")
    except Exception as e:
        logger.warning("Failed to record feedback: %s", e)
        return SpecialistFeedbackResponse(recorded=False, message=str(e))
