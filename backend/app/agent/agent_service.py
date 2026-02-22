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
from app.models.database import Insight
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
            suggestions = self._parse_suggestions(response)
            
            # Save insight if prompt_id is provided
            if prompt_id:
                self._save_insight(prompt_id, suggestions)
            
            return suggestions
        except Exception as e:
            logger.error(f"Error getting agent suggestions: {e}")
            # Return empty suggestions on error
            return AgentSuggestions()
    
    def _save_insight(self, prompt_id: int, suggestions: AgentSuggestions):
        """
        Save agent suggestions as an Insight record.
        
        Args:
            prompt_id: ID of the prompt
            suggestions: AgentSuggestions to save
        """
        try:
            # Convert Pydantic models to dict for JSON storage
            # Pydantic v2 uses model_dump(), v1 uses dict()
            improvement_ideas_dict = None
            if suggestions.improvement_ideas:
                improvement_ideas_dict = [
                    idea.model_dump() if hasattr(idea, 'model_dump') else (
                        idea.dict() if hasattr(idea, 'dict') else idea
                    )
                    for idea in suggestions.improvement_ideas
                ]
            
            reusable_patterns_dict = None
            if suggestions.reusable_patterns:
                reusable_patterns_dict = [
                    pattern.model_dump() if hasattr(pattern, 'model_dump') else (
                        pattern.dict() if hasattr(pattern, 'dict') else pattern
                    )
                    for pattern in suggestions.reusable_patterns
                ]
            
            warnings_dict = None
            if suggestions.warnings:
                warnings_dict = [
                    warning.model_dump() if hasattr(warning, 'model_dump') else (
                        warning.dict() if hasattr(warning, 'dict') else warning
                    )
                    for warning in suggestions.warnings
                ]
            
            # Only save if there's at least one suggestion
            if improvement_ideas_dict or reusable_patterns_dict or warnings_dict:
                insight = Insight(
                    prompt_id=prompt_id,
                    improvement_ideas=improvement_ideas_dict,
                    reusable_patterns=reusable_patterns_dict,
                    warnings=warnings_dict
                )
                
                self.db.add(insight)
                self.db.commit()
                self.db.refresh(insight)
                
                logger.info(
                    f"Saved insight for prompt {prompt_id}: "
                    f"{len(improvement_ideas_dict or [])} improvements, "
                    f"{len(reusable_patterns_dict or [])} patterns, "
                    f"{len(warnings_dict or [])} warnings"
                )
            else:
                logger.debug(f"No suggestions to save for prompt {prompt_id}")
                
        except Exception as e:
            logger.error(f"Error saving insight for prompt {prompt_id}: {e}", exc_info=True)
            # Don't fail the analysis if saving insight fails
            self.db.rollback()
    
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
    
    def _extract_json(self, text: str) -> str:
        """
        Extract JSON from text that may contain markdown, explanations, or extra text.
        
        Args:
            text: Text that may contain JSON
            
        Returns:
            JSON string
        """
        if not text:
            return "{}"
        
        # Remove markdown code blocks
        import re
        
        # Try to find JSON in markdown code blocks first
        json_block_pattern = r'```(?:json)?\s*(\{.*?\})\s*```'
        match = re.search(json_block_pattern, text, re.DOTALL)
        if match:
            json_text = match.group(1)
        else:
            # Try to find first JSON object
            json_object_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
            matches = re.findall(json_object_pattern, text, re.DOTALL)
            if matches:
                # Return the longest match (most likely to be complete)
                json_text = max(matches, key=len)
            else:
                # If no pattern found, try to parse the whole text
                json_text = text.strip()
        
        # Clean invalid control characters (JSON spec allows \n, \r, \t but not other control chars)
        # Remove control characters except \n (0x0A), \r (0x0D), \t (0x09)
        json_text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', json_text)
        
        return json_text
    
    def _parse_suggestions(self, json_response: str) -> AgentSuggestions:
        """
        Parse JSON response into AgentSuggestions.
        
        Args:
            json_response: JSON string from LLM (may contain extra text)
            
        Returns:
            AgentSuggestions object
        """
        try:
            # Extract JSON from response (may contain markdown or extra text)
            json_text = self._extract_json(json_response)
            
            # Try to parse the extracted JSON
            # Use strict=False to be more lenient with some edge cases
            try:
                data = json.loads(json_text, strict=False)
            except json.JSONDecodeError as parse_error:
                # If still fails, try more aggressive cleaning
                logger.debug(f"First parse attempt failed: {parse_error}. Trying more aggressive cleaning...")
                # Remove any remaining problematic characters
                json_text_clean = re.sub(r'[^\x20-\x7E\n\t\r]', '', json_text)
                data = json.loads(json_text_clean, strict=False)
            
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
            logger.debug(f"Original response (first 1000 chars): {json_response[:1000]}")
            logger.debug(f"Extracted JSON (first 500 chars): {json_text[:500] if 'json_text' in locals() else 'N/A'}")
            
            # Try to find and extract JSON more aggressively using brace matching
            try:
                import re
                # Look for JSON object boundaries more carefully
                start_idx = json_response.find('{')
                if start_idx != -1:
                    # Find matching closing brace
                    brace_count = 0
                    end_idx = start_idx
                    for i in range(start_idx, len(json_response)):
                        if json_response[i] == '{':
                            brace_count += 1
                        elif json_response[i] == '}':
                            brace_count -= 1
                            if brace_count == 0:
                                end_idx = i + 1
                                break
                    
                    if end_idx > start_idx:
                        extracted = json_response[start_idx:end_idx]
                        # Clean control characters before parsing
                        extracted_clean = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', extracted)
                        try:
                            data = json.loads(extracted_clean, strict=False)
                        except json.JSONDecodeError:
                            # Try even more aggressive cleaning
                            extracted_clean = re.sub(r'[^\x20-\x7E\n\t\r]', '', extracted)
                            data = json.loads(extracted_clean, strict=False)
                        logger.info("Successfully extracted JSON using brace matching")
                        
                        # Parse the successfully extracted JSON
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
                else:
                    logger.warning("No JSON object found in response")
            except Exception as fallback_error:
                logger.error(f"Fallback JSON extraction also failed: {fallback_error}")
            
            return AgentSuggestions()
        except Exception as e:
            logger.error(f"Error parsing suggestions: {e}")
            logger.debug(f"Response was: {json_response[:500]}")
            return AgentSuggestions()
