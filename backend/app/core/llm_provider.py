"""
Abstract LLM Provider Interface.

This module defines the abstract interface for LLM providers,
following the AI provider abstraction principle from the architecture.
"""
from abc import ABC, abstractmethod
from typing import Dict
from pydantic import BaseModel


class PromptImprovementResult(BaseModel):
    """Result model for prompt improvement."""
    improved_prompt: str
    explanation: str
    provider: str = "unknown"  # Name of the provider used (e.g., "OpenAIProvider", "GroqProvider", "MockLLMProvider")


class LLMProvider(ABC):
    """
    Abstract base class for LLM providers.
    
    This interface ensures all LLM providers implement the same contract,
    allowing easy swapping between different AI providers (OpenAI, Anthropic, etc.)
    following the AI provider abstraction principle.
    """
    
    @abstractmethod
    async def improve_prompt(self, prompt: str) -> Dict[str, str]:
        """
        Improve a prompt using the LLM provider.
        
        Args:
            prompt: The original prompt text to improve
            
        Returns:
            Dictionary containing:
                - improved_prompt: The enhanced/improved version of the prompt
                - explanation: Explanation of what improvements were made and why
            
        Raises:
            NotImplementedError: If the method is not implemented by a subclass
            Exception: Provider-specific exceptions (API errors, etc.)
        """
        pass
    
    @abstractmethod
    async def improve_prompt_structured(self, prompt: str) -> PromptImprovementResult:
        """
        Improve a prompt using the LLM provider (structured response).
        
        Args:
            prompt: The original prompt text to improve
            
        Returns:
            PromptImprovementResult containing improved_prompt and explanation
            
        Raises:
            NotImplementedError: If the method is not implemented by a subclass
            Exception: Provider-specific exceptions (API errors, etc.)
        """
        pass
