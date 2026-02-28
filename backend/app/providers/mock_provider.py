"""
Mock LLM Provider Implementation.

This is a mock implementation of LLMProvider for testing and development.
It returns simple formatting improvements without making actual API calls.
"""
import re
from typing import Dict

from app.core.llm_provider import LLMProvider, PromptImprovementResult


class MockLLMProvider(LLMProvider):
    """
    Mock implementation of LLMProvider.
    
    This provider returns simple formatting improvements without making
    actual API calls. Useful for testing and development.
    """
    
    def __init__(self):
        """Initialize the mock provider (no configuration needed)."""
        pass
    
    async def improve_prompt(self, prompt: str) -> Dict[str, str]:
        """
        Improve a prompt with simple formatting improvements.
        
        Args:
            prompt: The original prompt text to improve
            
        Returns:
            Dictionary with 'improved_prompt' and 'explanation' keys
        """
        improved_prompt = self._apply_formatting_improvements(prompt)
        explanation = self._generate_explanation(prompt, improved_prompt)
        
        return {
            "improved_prompt": improved_prompt,
            "explanation": explanation
        }
    
    async def improve_prompt_structured(self, prompt: str) -> PromptImprovementResult:
        """
        Improve a prompt with simple formatting improvements (structured response).
        
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
    
    def _apply_formatting_improvements(self, prompt: str) -> str:
        """
        Apply simple formatting improvements to the prompt.
        
        Args:
            prompt: Original prompt text
            
        Returns:
            Improved prompt with better formatting
        """
        improved = prompt.strip()
        
        # Ensure proper capitalization at the start
        if improved and not improved[0].isupper():
            improved = improved[0].upper() + improved[1:]
        
        # Ensure the prompt ends with proper punctuation
        if improved and improved[-1] not in ['.', '!', '?']:
            improved += '.'
        
        # Add line breaks for better readability if prompt is long
        if len(improved) > 100:
            # Try to break at sentence boundaries
            sentences = re.split(r'([.!?]\s+)', improved)
            if len(sentences) > 2:
                improved = ''.join(sentences)
        
        # Remove excessive whitespace
        improved = re.sub(r'\s+', ' ', improved)
        improved = improved.strip()
        
        # Ensure consistent spacing around punctuation
        improved = re.sub(r'\s+([,.!?])', r'\1', improved)
        improved = re.sub(r'([,.!?])([^\s])', r'\1 \2', improved)
        
        return improved
    
    def _generate_explanation(self, original: str, improved: str) -> str:
        """
        Generate a fake explanation of the improvements made.
        
        Args:
            original: Original prompt text
            improved: Improved prompt text
            
        Returns:
            Explanation string
        """
        improvements = []
        
        # Check for capitalization improvements
        if original and original[0].islower() and improved[0].isupper():
            improvements.append("Capitalized the first letter for better readability")
        
        # Check for punctuation improvements
        if original and original[-1] not in ['.', '!', '?'] and improved[-1] in ['.', '!', '?']:
            improvements.append("Added proper ending punctuation")
        
        # Check for whitespace improvements
        if len(re.findall(r'\s{2,}', original)) > len(re.findall(r'\s{2,}', improved)):
            improvements.append("Normalized whitespace and removed excessive spaces")
        
        # Check for punctuation spacing
        if re.search(r'[,.!?][^\s]', original) and not re.search(r'[,.!?][^\s]', improved):
            improvements.append("Added proper spacing around punctuation marks")
        
        # Default explanation if no specific improvements detected
        if not improvements:
            improvements.append("Applied general formatting improvements for clarity")
        
        explanation = (
            "The prompt has been improved with the following enhancements: "
            + "; ".join(improvements) + ". "
            + "These changes enhance readability while maintaining the original intent."
        )
        
        return explanation

    async def chat(self, system: str, user: str, max_tokens: int = 4000) -> str:
        """Mock chat: returns minimal JSON so callers can detect and fallback."""
        return (
            '{"context":"(Mock: configure a real LLM provider for expert prompts.)",'
            '"problem_description":"(Mock)","analysis_strategy":"(Mock)","technical_steps":"(Mock)",'
            '"edge_cases":"(Mock)","validation_checklist":"(Mock)","expected_result":"(Mock)"}'
        )
