"""
Groq LLM Provider Implementation.

This module implements the LLMProvider interface using Groq's OpenAI-compatible API.
"""
import logging
from typing import Dict
from openai import AsyncOpenAI
from openai import APIError

from app.core.llm_provider import LLMProvider, PromptImprovementResult
from app.core.config import settings

logger = logging.getLogger(__name__)

# Groq's OpenAI-compatible API base URL
GROQ_BASE_URL = "https://api.groq.com/openai/v1"

# System instruction for prompt improvement
SYSTEM_INSTRUCTION = (
    "You are a prompt engineering expert. "
    "Improve the prompt structure without changing intent."
)


class GroqProvider(LLMProvider):
    """
    Groq implementation of LLMProvider.
    
    Uses Groq's OpenAI-compatible Chat Completion API to improve prompts.
    """
    
    def __init__(self, api_key: str = None, model: str = None):
        """
        Initialize the Groq provider.
        
        Args:
            api_key: Groq API key (defaults to settings.GROQ_API_KEY)
            model: Groq model to use (defaults to settings.GROQ_MODEL)
        """
        self.api_key = api_key or settings.GROQ_API_KEY
        self.model = model or settings.GROQ_MODEL
        
        if not self.api_key:
            raise ValueError("Groq API key is required. Set GROQ_API_KEY in settings or .env file.")
        
        # Use OpenAI SDK with Groq's base URL for OpenAI-compatible API
        self.client = AsyncOpenAI(
            api_key=self.api_key,
            base_url=GROQ_BASE_URL
        )
    
    async def improve_prompt(self, prompt: str) -> Dict[str, str]:
        """
        Improve a prompt using Groq's Chat Completion API.
        
        Args:
            prompt: The original prompt text to improve
            
        Returns:
            Dictionary with 'improved_prompt' and 'explanation' keys
            
        Raises:
            APIError: If Groq API call fails
            ValueError: If API key is not configured
        """
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": SYSTEM_INSTRUCTION
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Please improve the following prompt and provide both the improved version "
                            f"and an explanation of the improvements made.\n\n"
                            f"Original prompt:\n{prompt}\n\n"
                            f"Please respond in the following exact format:\n"
                            f"IMPROVED_PROMPT:\n[your improved prompt here]\n\n"
                            f"EXPLANATION:\n[your explanation here]"
                        )
                    }
                ],
                temperature=0.7,
                max_tokens=1500
            )
            
            # Extract the response content
            if not response.choices or not response.choices[0].message.content:
                raise ValueError("Groq API returned empty response")
            
            content = response.choices[0].message.content
            
            # Parse the response to extract improved_prompt and explanation
            improved_prompt, explanation = self._parse_response(content)
            
            return {
                "improved_prompt": improved_prompt,
                "explanation": explanation
            }
            
        except APIError as e:
            logger.error(f"Groq API error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in Groq provider: {e}")
            raise
    
    async def improve_prompt_structured(self, prompt: str) -> PromptImprovementResult:
        """
        Improve a prompt using Groq's Chat Completion API (structured response).
        
        Args:
            prompt: The original prompt text to improve
            
        Returns:
            PromptImprovementResult with improved_prompt and explanation
        """
        result = await self.improve_prompt(prompt)
        return PromptImprovementResult(
            improved_prompt=result["improved_prompt"],
            explanation=result["explanation"]
        )
    
    def _parse_response(self, content: str) -> tuple[str, str]:
        """
        Parse the Groq response to extract improved_prompt and explanation.
        
        Args:
            content: Raw response content from Groq
            
        Returns:
            Tuple of (improved_prompt, explanation)
        """
        content = content.strip()
        
        # Try to parse structured response with IMPROVED_PROMPT: and EXPLANATION: markers
        if "IMPROVED_PROMPT:" in content:
            # Split by IMPROVED_PROMPT: marker
            parts = content.split("IMPROVED_PROMPT:", 1)
            if len(parts) > 1:
                improved_section = parts[1]
                
                # Check if EXPLANATION: marker exists
                if "EXPLANATION:" in improved_section:
                    improved_parts = improved_section.split("EXPLANATION:", 1)
                    improved_prompt = improved_parts[0].strip()
                    explanation = improved_parts[1].strip()
                    return improved_prompt, explanation
                else:
                    # Only IMPROVED_PROMPT found, use rest as explanation
                    improved_prompt = improved_section.strip()
                    explanation = "Prompt structure improved. Review the changes above."
                    return improved_prompt, explanation
        
        # Fallback: if structured format not found, try to split by double newlines
        if "\n\n" in content:
            parts = content.split("\n\n", 1)
            if len(parts) == 2:
                improved_prompt = parts[0].strip()
                explanation = parts[1].strip()
                return improved_prompt, explanation
        
        # Last resort: return content as improved_prompt with generic explanation
        return content, "Prompt improved using Groq. Review the changes above."
