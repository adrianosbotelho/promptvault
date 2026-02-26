"""
Mentor review service.

Takes a technical problem description and asks the LLM provider to produce:
- mentor_advice
- architect_observation
- risk_alert
"""

import json
import logging
import re
from typing import Any, Dict, Optional

from app.core.llm_provider import LLMProvider
from app.models.mentor import MentorReviewResponse

logger = logging.getLogger(__name__)


class MentorReviewService:
    """Service responsible for generating mentor reviews using an LLM provider."""

    SYSTEM_PROMPT = """You are a senior software mentor and software architect.

You will receive a technical problem description.

Respond ONLY with a single JSON object with the following string fields:
- mentor_advice: Concise, practical guidance for the developer.
- architect_observation: Architectural perspective, trade-offs, or design concerns.
- risk_alert: Any risks, anti-patterns, or missing information that could cause problems.

The JSON must be valid and parseable. Do not include any text before or after the JSON.
Use clear, direct language. Answer in the same language as the input (if Portuguese, answer in Portuguese)."""

    def __init__(self, llm_provider: LLMProvider) -> None:
        self.llm_provider = llm_provider

    async def review(self, text: str) -> MentorReviewResponse:
        """Generate a mentor review for the given technical description."""
        prompt = self._build_prompt(text)

        try:
            logger.info("Requesting mentor review from LLM provider")
            result: Dict[str, Any] = await self.llm_provider.improve_prompt(prompt)
            raw = (result or {}).get("improved_prompt") or ""

            data = self._extract_json_object(raw)
            if isinstance(data, dict):
                mentor_advice = str(data.get("mentor_advice", "") or "").strip()
                architect_observation = str(data.get("architect_observation", "") or "").strip()
                risk_alert = str(data.get("risk_alert", "") or "").strip()

                return MentorReviewResponse(
                    mentor_advice=mentor_advice or "Nenhum conselho gerado.",
                    architect_observation=architect_observation or "",
                    risk_alert=risk_alert or "",
                )

            logger.warning("LLM response did not contain valid JSON object, falling back to raw text")
            fallback_text = raw.strip() or "Nenhum conselho gerado."
            return MentorReviewResponse(
                mentor_advice=fallback_text,
                architect_observation="",
                risk_alert="",
            )

        except Exception as e:
            logger.error(f"Error while generating mentor review: {e}", exc_info=True)
            return MentorReviewResponse(
                mentor_advice="Ocorreu um erro ao gerar o conselho do mentor.",
                architect_observation="",
                risk_alert="Não foi possível avaliar riscos devido a um erro interno.",
            )

    def _build_prompt(self, text: str) -> str:
        """Build the prompt sent to the LLM."""
        return f"{self.SYSTEM_PROMPT}\n\nTechnical problem description:\n{text}"

    def _extract_json_object(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Try to extract a JSON object from the LLM response text.

        The provider may wrap the JSON with extra text; this attempts to
        locate the first {...} block and parse it.
        """
        if not text:
            return None

        # First, try to parse the entire text as JSON
        try:
            obj = json.loads(text)
            if isinstance(obj, dict):
                return obj
        except json.JSONDecodeError:
            pass

        # Then, try to find a JSON object within the text
        try:
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if match:
                candidate = match.group(0)
                return json.loads(candidate)
        except json.JSONDecodeError:
            return None
        except Exception:
            return None

        return None

