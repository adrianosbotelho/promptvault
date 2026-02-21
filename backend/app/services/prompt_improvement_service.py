"""
Prompt Improvement Service.

This service handles prompt improvement using LLM providers.
"""
import logging
from typing import Optional

from app.core.llm_provider import LLMProvider, PromptImprovementResult
from app.providers.openai_provider import OpenAIProvider
from app.providers.mock_provider import MockLLMProvider
from openai import APIError

logger = logging.getLogger(__name__)


class PromptImprovementService:
    """Service for improving prompts using LLM providers."""
    
    def __init__(self, provider: Optional[LLMProvider] = None):
        """
        Initialize the service with an LLM provider.
        
        Args:
            provider: LLM provider instance (defaults to OpenAIProvider)
        """
        self.provider = provider or OpenAIProvider()
        self._fallback_provider = MockLLMProvider()
    
    async def improve_prompt(self, prompt: str) -> PromptImprovementResult:
        """
        Improve a prompt using the configured LLM provider.
        Falls back to MockLLMProvider if the primary provider fails.
        
        Args:
            prompt: The original prompt text to improve
            
        Returns:
            PromptImprovementResult with improved_prompt and explanation
            
        Raises:
            Exception: If both providers fail
        """
        try:
            logger.info(f"Improving prompt (length: {len(prompt)} chars) using {type(self.provider).__name__}")
            result = await self.provider.improve_prompt_structured(prompt)
            logger.info("Prompt improvement completed successfully")
            return result
        except (APIError, ValueError, Exception) as e:
            # If primary provider fails (API error, quota exceeded, etc.), use fallback
            error_msg = str(e)
            logger.warning(
                f"Primary provider ({type(self.provider).__name__}) failed: {error_msg}. "
                f"Falling back to MockLLMProvider"
            )
            
            try:
                result = await self._fallback_provider.improve_prompt_structured(prompt)
                logger.info("Prompt improvement completed using fallback provider")
                return result
            except Exception as fallback_error:
                logger.error(f"Fallback provider also failed: {fallback_error}", exc_info=True)
                raise
