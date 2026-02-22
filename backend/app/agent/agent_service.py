"""
Agent Service.

Service that builds context, sends it to AI, and returns structured suggestions.
"""
import json
import logging
from typing import Optional, List
from sqlalchemy.orm import Session

from app.agent.agent_context import AgentContextBuilder, AgentContext
from app.agent.agent_prompts import build_agent_prompt_with_context, AGENT_SYSTEM_PROMPT
from app.core.llm_provider import LLMProvider
from app.providers.openai_provider import OpenAIProvider
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class ImprovementIdea(BaseModel):
    """A single improvement idea for a prompt."""
    title: str
    description: str
    priority: str  # "high", "medium", "low"
    reasoning: str
    
    class Config:
        from_attributes = True


class ReusablePattern(BaseModel):
    """A reusable pattern found in prompts."""
    name: str
    description: str
    example: str
    use_cases: List[str]
    
    class Config:
        from_attributes = True


class Warning(BaseModel):
    """A warning about potential issues in a prompt."""
    severity: str  # "error", "warning", "info"
    message: str
    suggestion: Optional[str] = None
    
    class Config:
        from_attributes = True


class AgentSuggestions(BaseModel):
    """Structured suggestions from the agent."""
    improvement_ideas: List[ImprovementIdea] = []
    reusable_patterns: List[ReusablePattern] = []
    warnings: List[Warning] = []
    
    class Config:
        from_attributes = True


class AgentService:
    """Service for getting AI agent suggestions based on prompt context."""
    
    def __init__(self, db: Session, llm_provider: Optional[LLMProvider] = None):
        """
        Initialize the agent service.
        
        Args:
            db: Database session
            llm_provider: LLM provider instance (defaults to OpenAIProvider)
        """
        self.db = db
        self.llm_provider = llm_provider or OpenAIProvider()
    
    async def get_suggestions(
        self,
        prompt_id: Optional[int] = None,
        user_query: str = "Analyze this prompt and provide suggestions for improvements, reusable patterns, and any warnings.",
        similar_count: int = 5,
        latest_count: int = 10
    ) -> AgentSuggestions:
        """
        Get structured suggestions for a prompt.
        
        Args:
            prompt_id: ID of the current prompt (optional)
            user_query: User's query or request
            similar_count: Number of similar prompts to include
            latest_count: Number of latest prompts to include
            
        Returns:
            AgentSuggestions with improvement ideas, patterns, and warnings
        """
        # Build context
        builder = AgentContextBuilder(self.db)
        if prompt_id:
            builder.with_current_prompt(prompt_id)
        
        context = (
            builder
            .with_similar_prompts(count=similar_count)
            .with_latest_prompts(count=latest_count)
            .build()
        )
        
        # Build prompt with context
        current_prompt_content = None
        if context.current_prompt and context.current_prompt.versions:
            latest_version = max(
                context.current_prompt.versions,
                key=lambda v: v.version
            )
            current_prompt_content = latest_version.content
        
        prompt = build_agent_prompt_with_context(
            user_query=user_query,
            current_prompt_content=current_prompt_content,
            similar_prompts=context.similar_prompts,
            latest_prompts=context.latest_prompts
        )
        
        # Add structured output instruction
        structured_prompt = f"""{prompt}

Please provide your response in the following JSON format:
{{
    "improvement_ideas": [
        {{
            "title": "Short title",
            "description": "Detailed description",
            "priority": "high|medium|low",
            "reasoning": "Why this improvement helps"
        }}
    ],
    "reusable_patterns": [
        {{
            "name": "Pattern name",
            "description": "What this pattern does",
            "example": "Example usage",
            "use_cases": ["use case 1", "use case 2"]
        }}
    ],
    "warnings": [
        {{
            "severity": "error|warning|info",
            "message": "Warning message",
            "suggestion": "Optional suggestion"
        }}
    ]
}}

Return only valid JSON, no additional text."""
        
        # Send to LLM
        try:
            response = await self._call_llm_structured(structured_prompt)
            return self._parse_suggestions(response)
        except Exception as e:
            logger.error(f"Error getting agent suggestions: {e}")
            # Return empty suggestions on error
            return AgentSuggestions()
    
    async def _call_llm_structured(self, prompt: str) -> str:
        """
        Call LLM with structured output request.
        Falls back to Groq on 429 error, then to MockLLMProvider.
        
        Args:
            prompt: The prompt to send
            
        Returns:
            JSON string response
        """
        from openai import AsyncOpenAI, APIError
        from app.core.config import settings
        from app.providers.groq_provider import GroqProvider
        from app.providers.mock_provider import MockLLMProvider
        
        # Try OpenAI first
        if isinstance(self.llm_provider, OpenAIProvider):
            try:
                client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                
                response = await client.chat.completions.create(
                    model=settings.OPENAI_MODEL,
                    messages=[
                        {"role": "system", "content": AGENT_SYSTEM_PROMPT},
                        {"role": "user", "content": prompt}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.7
                )
                
                return response.choices[0].message.content or "{}"
            except APIError as e:
                # Check if it's a 429 (rate limit) error
                if e.status_code == 429:
                    logger.warning(f"OpenAI rate limit (429) encountered. Trying Groq...")
                    # Try Groq as fallback
                    try:
                        if settings.GROQ_API_KEY and settings.GROQ_API_KEY.strip():
                            groq_provider = GroqProvider()
                            client = AsyncOpenAI(
                                api_key=settings.GROQ_API_KEY,
                                base_url="https://api.groq.com/openai/v1"
                            )
                            
                            response = await client.chat.completions.create(
                                model=settings.GROQ_MODEL,
                                messages=[
                                    {"role": "system", "content": AGENT_SYSTEM_PROMPT},
                                    {"role": "user", "content": prompt}
                                ],
                                response_format={"type": "json_object"},
                                temperature=0.7
                            )
                            
                            logger.info("Successfully used Groq as fallback")
                            return response.choices[0].message.content or "{}"
                        else:
                            logger.warning("Groq API key not configured, skipping Groq fallback")
                    except Exception as groq_error:
                        logger.warning(f"Groq fallback also failed: {groq_error}. Using MockLLMProvider")
                        # Fall through to MockLLMProvider
                else:
                    # Other OpenAI errors, try Groq if available
                    logger.warning(f"OpenAI error ({e.status_code}): {e}. Trying Groq...")
                    try:
                        if settings.GROQ_API_KEY and settings.GROQ_API_KEY.strip():
                            client = AsyncOpenAI(
                                api_key=settings.GROQ_API_KEY,
                                base_url="https://api.groq.com/openai/v1"
                            )
                            
                            response = await client.chat.completions.create(
                                model=settings.GROQ_MODEL,
                                messages=[
                                    {"role": "system", "content": AGENT_SYSTEM_PROMPT},
                                    {"role": "user", "content": prompt}
                                ],
                                response_format={"type": "json_object"},
                                temperature=0.7
                            )
                            
                            logger.info("Successfully used Groq as fallback")
                            return response.choices[0].message.content or "{}"
                    except Exception:
                        pass
                
                # If Groq also failed or not available, use MockLLMProvider
                logger.warning("Falling back to MockLLMProvider")
                mock_provider = MockLLMProvider()
                result = await mock_provider.improve_prompt(prompt)
                content = result.get("explanation", result.get("improved_prompt", "{}"))
                import re
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    return json_match.group(0)
                return "{}"
            except Exception as e:
                logger.error(f"Error calling OpenAI: {e}")
                # Try Groq as fallback
                try:
                    if settings.GROQ_API_KEY and settings.GROQ_API_KEY.strip():
                        client = AsyncOpenAI(
                            api_key=settings.GROQ_API_KEY,
                            base_url="https://api.groq.com/openai/v1"
                        )
                        
                        response = await client.chat.completions.create(
                            model=settings.GROQ_MODEL,
                            messages=[
                                {"role": "system", "content": AGENT_SYSTEM_PROMPT},
                                {"role": "user", "content": prompt}
                            ],
                            response_format={"type": "json_object"},
                            temperature=0.7
                        )
                        
                        logger.info("Successfully used Groq as fallback")
                        return response.choices[0].message.content or "{}"
                except Exception:
                    pass
                
                # Final fallback to MockLLMProvider
                logger.warning("Falling back to MockLLMProvider")
                mock_provider = MockLLMProvider()
                result = await mock_provider.improve_prompt(prompt)
                content = result.get("explanation", result.get("improved_prompt", "{}"))
                import re
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    return json_match.group(0)
                return "{}"
        else:
            # Not OpenAI provider, try to use it directly
            try:
                result = await self.llm_provider.improve_prompt(prompt)
                content = result.get("explanation", result.get("improved_prompt", "{}"))
                import re
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    return json_match.group(0)
                return "{}"
            except Exception as e:
                logger.error(f"Error calling LLM provider: {e}")
                # Try Groq as fallback
                try:
                    if settings.GROQ_API_KEY and settings.GROQ_API_KEY.strip():
                        client = AsyncOpenAI(
                            api_key=settings.GROQ_API_KEY,
                            base_url="https://api.groq.com/openai/v1"
                        )
                        
                        response = await client.chat.completions.create(
                            model=settings.GROQ_MODEL,
                            messages=[
                                {"role": "system", "content": AGENT_SYSTEM_PROMPT},
                                {"role": "user", "content": prompt}
                            ],
                            response_format={"type": "json_object"},
                            temperature=0.7
                        )
                        
                        logger.info("Successfully used Groq as fallback")
                        return response.choices[0].message.content or "{}"
                except Exception:
                    pass
                
                # Final fallback to MockLLMProvider
                logger.warning("Falling back to MockLLMProvider")
                mock_provider = MockLLMProvider()
                result = await mock_provider.improve_prompt(prompt)
                content = result.get("explanation", result.get("improved_prompt", "{}"))
                import re
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    return json_match.group(0)
                return "{}"
    
    def _parse_suggestions(self, json_response: str) -> AgentSuggestions:
        """
        Parse JSON response into AgentSuggestions.
        
        Args:
            json_response: JSON string from LLM
            
        Returns:
            AgentSuggestions object
        """
        try:
            data = json.loads(json_response)
            
            improvement_ideas = [
                ImprovementIdea(**item)
                for item in data.get("improvement_ideas", [])
            ]
            
            reusable_patterns = [
                ReusablePattern(**item)
                for item in data.get("reusable_patterns", [])
            ]
            
            warnings = [
                Warning(**item)
                for item in data.get("warnings", [])
            ]
            
            return AgentSuggestions(
                improvement_ideas=improvement_ideas,
                reusable_patterns=reusable_patterns,
                warnings=warnings
            )
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing JSON response: {e}")
            logger.debug(f"Response was: {json_response[:500]}")
            return AgentSuggestions()
        except Exception as e:
            logger.error(f"Error parsing suggestions: {e}")
            return AgentSuggestions()
