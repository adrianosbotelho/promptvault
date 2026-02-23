from pydantic import BaseModel
from app.core.llm_provider import PromptImprovementResult


class PromptImprovementRequest(BaseModel):
    """Request model for prompt improvement."""
    prompt: str


class PromptImprovementResponse(BaseModel):
    """Response model for prompt improvement."""
    improved_prompt: str
    explanation: str
    provider: str  # Name of the provider used (e.g., "OpenAIProvider", "GroqProvider", "MockLLMProvider")
    
    @classmethod
    def from_result(cls, result: PromptImprovementResult) -> "PromptImprovementResponse":
        """Create response from PromptImprovementResult."""
        return cls(
            improved_prompt=result.improved_prompt,
            explanation=result.explanation,
            provider=result.provider
        )
