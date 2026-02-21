"""
Example LLM Provider Implementation.

This is a template/example showing how to implement the LLMProvider interface.
Replace this with actual provider implementations (OpenAI, Anthropic, etc.).
"""
from typing import Dict

from app.core.llm_provider import LLMProvider, PromptImprovementResult


class ExampleLLMProvider(LLMProvider):
    """
    Example implementation of LLMProvider.
    
    This demonstrates how to implement the abstract interface.
    Replace with actual LLM provider implementations.
    """
    
    def __init__(self, api_key: str = None):
        """
        Initialize the provider.
        
        Args:
            api_key: API key for the LLM provider (if required)
        """
        self.api_key = api_key
    
    async def improve_prompt(self, prompt: str) -> Dict[str, str]:
        """
        Improve a prompt using the LLM provider.
        
        Args:
            prompt: The original prompt text to improve
            
        Returns:
            Dictionary with 'improved_prompt' and 'explanation' keys
        """
        # This is a placeholder implementation
        # Replace with actual LLM API calls
        return {
            "improved_prompt": f"Improved: {prompt}",
            "explanation": "This is an example implementation. Replace with actual LLM provider logic."
        }
    
    async def improve_prompt_structured(self, prompt: str) -> PromptImprovementResult:
        """
        Improve a prompt using the LLM provider (structured response).
        
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
