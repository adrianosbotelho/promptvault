"""
Prompt Improvement Service.

This service handles prompt improvement using LLM providers.
"""
import logging
from typing import Optional

from app.core.llm_provider import LLMProvider, PromptImprovementResult
from app.providers.openai_provider import OpenAIProvider
from app.providers.groq_provider import GroqProvider
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
        self._groq_fallback = None
        self._mock_fallback = MockLLMProvider()
        
        # Initialize Groq fallback if API key is available
        from app.core.config import settings
        if settings.GROQ_API_KEY and settings.GROQ_API_KEY.strip():
            try:
                self._groq_fallback = GroqProvider()
            except Exception as e:
                logger.warning(f"Failed to initialize GroqProvider: {e}")
    
    async def improve_prompt(self, prompt: str) -> PromptImprovementResult:
        """
        Improve a prompt using the configured LLM provider.
        Falls back to MockLLMProvider if the primary provider fails.
        
        Args:
            prompt: The original prompt text to improve
            
        Returns:
            PromptImprovementResult with improved_prompt, explanation, and provider name
            
        Raises:
            Exception: If both providers fail
        """
        provider_name = type(self.provider).__name__
        try:
            logger.info(f"Improving prompt (length: {len(prompt)} chars) using {provider_name}")
            result = await self.provider.improve_prompt_structured(prompt)
            # Set provider name in result
            result.provider = provider_name
            logger.info(f"Prompt improvement completed successfully using {provider_name}")
            return result
        except (APIError, ValueError, Exception) as e:
            # Check if it's a 429 (rate limit) error
            is_rate_limit = isinstance(e, APIError) and e.status_code == 429
            
            error_msg = str(e)
            logger.warning(
                f"Primary provider ({provider_name}) failed: {error_msg}"
            )
            
            # Try Groq fallback first (especially for 429 errors)
            if self._groq_fallback:
                try:
                    logger.info("Trying Groq as fallback provider...")
                    result = await self._groq_fallback.improve_prompt_structured(prompt)
                    result.provider = "GroqProvider"
                    logger.info("Prompt improvement completed using Groq fallback")
                    return result
                except Exception as groq_error:
                    logger.warning(f"Groq fallback also failed: {groq_error}")
            
            # Final fallback to MockLLMProvider
            try:
                logger.warning("Falling back to MockLLMProvider")
                result = await self._mock_fallback.improve_prompt_structured(prompt)
                result.provider = "MockLLMProvider"
                logger.info("Prompt improvement completed using MockLLMProvider fallback")
                return result
            except Exception as fallback_error:
                logger.error(f"All providers failed, including fallback: {fallback_error}", exc_info=True)
                raise
