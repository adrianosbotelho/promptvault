"""
Hugging Face LLM Provider Implementation.

This module implements the LLMProvider interface using Hugging Face Inference API.
Hugging Face offers free tier with generous limits.
"""
import asyncio
import logging
from typing import Dict
import httpx
from pydantic import BaseModel

from app.core.llm_provider import LLMProvider, PromptImprovementResult
from app.core.config import settings
from app.core.prompt_improvement_instructions import (
    PROMPT_IMPROVEMENT_SYSTEM,
    build_improvement_user_message,
)

logger = logging.getLogger(__name__)

# Hugging Face Inference API endpoint
HUGGINGFACE_API_URL = "https://api-inference.huggingface.co/models"

# Default model (free, good for prompt analysis)
DEFAULT_MODEL = "mistralai/Mistral-7B-Instruct-v0.2"  # Free model with good performance


class HuggingFaceProvider(LLMProvider):
    """
    Hugging Face implementation of LLMProvider.
    
    Uses Hugging Face Inference API (free tier available).
    """
    
    def __init__(self, api_key: str = None, model: str = None):
        """
        Initialize the Hugging Face provider.
        
        Args:
            api_key: Hugging Face API key (defaults to settings.HUGGINGFACE_API_KEY)
            model: Model to use (defaults to DEFAULT_MODEL)
        """
        self.api_key = api_key or getattr(settings, 'HUGGINGFACE_API_KEY', None)
        self.model = model or DEFAULT_MODEL
        
        if not self.api_key:
            raise ValueError(
                "Hugging Face API key is required. Set HUGGINGFACE_API_KEY in settings or .env file. "
                "Get a free API key at https://huggingface.co/settings/tokens"
            )
        
        self.api_url = f"{HUGGINGFACE_API_URL}/{self.model}"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    async def improve_prompt(self, prompt: str) -> Dict[str, str]:
        """
        Improve a prompt using Hugging Face Inference API.
        
        Args:
            prompt: The original prompt text to improve
            
        Returns:
            Dictionary with 'improved_prompt' and 'explanation' keys
        """
        try:
            # Build the prompt for the model (HF API often uses a single input)
            full_prompt = f"""{PROMPT_IMPROVEMENT_SYSTEM}

{build_improvement_user_message(prompt)}"""
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.api_url,
                    headers=self.headers,
                    json={
                        "inputs": full_prompt,
                        "parameters": {
                            "max_new_tokens": 1000,
                            "temperature": 0.7,
                            "return_full_text": False
                        }
                    }
                )
                
                if response.status_code == 503:
                    # Model is loading, wait and retry
                    logger.warning("Hugging Face model is loading, waiting 10 seconds...")
                    await asyncio.sleep(10)
                    response = await client.post(
                        self.api_url,
                        headers=self.headers,
                        json={
                            "inputs": full_prompt,
                            "parameters": {
                                "max_new_tokens": 1000,
                                "temperature": 0.7,
                                "return_full_text": False
                            }
                        }
                    )
                
                response.raise_for_status()
                result = response.json()
                
                # Extract text from response
                if isinstance(result, list) and len(result) > 0:
                    content = result[0].get("generated_text", "")
                elif isinstance(result, dict):
                    content = result.get("generated_text", "")
                else:
                    content = str(result)
                
                if not content:
                    raise ValueError("Hugging Face API returned empty response")
                
                # Parse the response
                improved_prompt, explanation = self._parse_response(content)
                
                return {
                    "improved_prompt": improved_prompt,
                    "explanation": explanation
                }
                
        except httpx.HTTPStatusError as e:
            logger.error(f"Hugging Face API HTTP error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in Hugging Face provider: {e}")
            raise
    
    async def improve_prompt_structured(self, prompt: str) -> PromptImprovementResult:
        """
        Improve a prompt using Hugging Face (structured response).
        
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
        Parse the Hugging Face response to extract improved_prompt and explanation.
        
        Args:
            content: Raw response content from Hugging Face
            
        Returns:
            Tuple of (improved_prompt, explanation)
        """
        content = content.strip()
        
        # Try to parse structured response with IMPROVED_PROMPT: and EXPLANATION: markers
        if "IMPROVED_PROMPT:" in content:
            parts = content.split("IMPROVED_PROMPT:", 1)
            if len(parts) > 1:
                improved_section = parts[1]
                
                if "EXPLANATION:" in improved_section:
                    improved_parts = improved_section.split("EXPLANATION:", 1)
                    improved_prompt = improved_parts[0].strip()
                    explanation = improved_parts[1].strip()
                    return improved_prompt, explanation
                else:
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
        return content, "Prompt improved using Hugging Face. Review the changes above."
