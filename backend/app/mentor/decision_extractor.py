"""
Decision Extractor Module

Analyzes prompt content and extracts architectural decisions.
"""

import logging
import json
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from datetime import datetime

from app.core.llm_provider import LLMProvider
from app.core.dependencies import get_llm_provider

logger = logging.getLogger(__name__)


@dataclass
class ArchitecturalDecision:
    """Represents an architectural decision extracted from a prompt."""
    
    decision_type: str  # e.g., "async_approach", "sql_optimization", "service_separation", "refactoring"
    description: str  # Human-readable description of the decision
    rationale: Optional[str] = None  # Why this decision was made
    confidence: float = 0.0  # Confidence score (0.0 to 1.0)
    context: Optional[str] = None  # Additional context or details


class DecisionExtractor:
    """
    Extracts architectural decisions from prompt content.
    
    Examples of decisions:
    - chose async approach
    - optimized SQL performance
    - separated service layer
    - refactoring strategy
    """
    
    SYSTEM_PROMPT = """You are an expert software architect analyzing code and prompts to extract architectural decisions.

Your task is to identify and extract architectural decisions from the given prompt content.

Types of decisions to look for:
1. **Async Approach** - Decisions about asynchronous programming, concurrency, or parallel processing
2. **SQL/Performance Optimization** - Database query optimization, indexing strategies, performance tuning
3. **Service Layer Separation** - Separation of concerns, layered architecture, service boundaries
4. **Refactoring Strategy** - Code restructuring, design pattern application, technical debt reduction
5. **Technology Choices** - Framework selection, library choices, tool adoption
6. **Data Modeling** - Database schema design, data structure choices
7. **Security Decisions** - Authentication, authorization, encryption strategies
8. **Scalability Patterns** - Caching, load balancing, distributed systems approaches

For each decision found, provide:
- decision_type: A short identifier (e.g., "async_approach", "sql_optimization")
- description: A clear, concise description of the decision
- rationale: Why this decision was made (if evident)
- confidence: Your confidence level (0.0 to 1.0)
- context: Additional relevant details

Return your analysis as a JSON array of decisions. If no decisions are found, return an empty array.

Example response format:
[
  {
    "decision_type": "async_approach",
    "description": "Chose async/await pattern for I/O operations",
    "rationale": "To improve performance and avoid blocking operations",
    "confidence": 0.85,
    "context": "Applied to database queries and API calls"
  },
  {
    "decision_type": "service_separation",
    "description": "Separated business logic into service layer",
    "rationale": "To improve maintainability and testability",
    "confidence": 0.90,
    "context": "Created dedicated service classes for each domain"
  }
]"""

    DEFAULT_QUERY = """Analyze the following prompt content and extract all architectural decisions.

Prompt content:
{prompt_content}

Return a JSON array of architectural decisions found in the prompt."""

    def __init__(self, llm_provider: Optional[LLMProvider] = None):
        """
        Initialize DecisionExtractor.
        
        Args:
            llm_provider: Optional LLM provider. If not provided, will use default from dependencies.
        """
        self.llm_provider = llm_provider
    
    async def extract_decisions(
        self,
        prompt_content: str,
        max_decisions: int = 10
    ) -> List[ArchitecturalDecision]:
        """
        Extract architectural decisions from prompt content.
        
        Args:
            prompt_content: The prompt content to analyze
            max_decisions: Maximum number of decisions to return
            
        Returns:
            List of ArchitecturalDecision objects
        """
        if not prompt_content or not prompt_content.strip():
            logger.warning("Empty prompt content provided to DecisionExtractor")
            return []
        
        try:
            # Get LLM provider
            if not self.llm_provider:
                # Try to get from dependencies (synchronous function)
                from app.core.dependencies import get_llm_provider
                try:
                    self.llm_provider = get_llm_provider()
                except Exception as e:
                    logger.warning(f"Could not get LLM provider from dependencies: {e}")
                    return []
            
            # Prepare the query
            query = self.DEFAULT_QUERY.format(prompt_content=prompt_content[:5000])  # Limit content length
            
            # Call LLM (async)
            logger.info(f"Extracting architectural decisions from prompt (length: {len(prompt_content)})")
            response = await self.llm_provider.improve_prompt(query)
            
            # Parse the response
            improved_text = response.get('improved_prompt', '')
            explanation = response.get('explanation', '')
            
            # Try to extract JSON from the response
            decisions = self._extract_decisions_from_response(improved_text, explanation)
            
            # Limit to max_decisions
            if len(decisions) > max_decisions:
                decisions = decisions[:max_decisions]
            
            logger.info(f"Extracted {len(decisions)} architectural decisions")
            return decisions
            
        except Exception as e:
            logger.error(f"Error extracting architectural decisions: {e}", exc_info=True)
            return []
    
    def _extract_decisions_from_response(
        self,
        improved_text: str,
        explanation: str
    ) -> List[ArchitecturalDecision]:
        """
        Extract decisions from LLM response text.
        
        Args:
            improved_text: The improved prompt text from LLM
            explanation: The explanation from LLM
            
        Returns:
            List of ArchitecturalDecision objects
        """
        decisions = []
        
        # Combine both texts to search for JSON
        full_text = f"{improved_text}\n\n{explanation}"
        
        # Try to find JSON array in the response
        json_data = self._extract_json(full_text)
        
        if json_data and isinstance(json_data, list):
            for item in json_data:
                if isinstance(item, dict):
                    try:
                        decision = ArchitecturalDecision(
                            decision_type=item.get('decision_type', 'unknown'),
                            description=item.get('description', ''),
                            rationale=item.get('rationale'),
                            confidence=float(item.get('confidence', 0.0)),
                            context=item.get('context')
                        )
                        decisions.append(decision)
                    except (ValueError, TypeError) as e:
                        logger.warning(f"Error parsing decision item: {e}")
                        continue
        
        return decisions
    
    def _extract_json(self, text: str) -> Optional[Any]:
        """
        Extract JSON from text that might contain markdown or extra text.
        
        Args:
            text: Text that may contain JSON
            
        Returns:
            Parsed JSON object or None
        """
        if not text:
            return None
        
        # Try to find JSON within markdown code blocks first
        import re
        
        # Look for JSON in code blocks
        code_block_pattern = r'```(?:json)?\s*(\[.*?\])\s*```'
        match = re.search(code_block_pattern, text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass
        
        # Look for JSON array directly
        array_pattern = r'(\[.*?\])'
        matches = re.finditer(array_pattern, text, re.DOTALL)
        for match in matches:
            try:
                # Clean the JSON string
                json_str = match.group(1)
                # Remove invalid control characters except newlines, tabs, and carriage returns
                json_str = ''.join(
                    char for char in json_str
                    if ord(char) >= 32 or char in '\n\r\t'
                )
                return json.loads(json_str, strict=False)
            except json.JSONDecodeError:
                continue
        
        # Try to parse the whole text as JSON
        try:
            cleaned_text = ''.join(
                char for char in text
                if ord(char) >= 32 or char in '\n\r\t'
            )
            return json.loads(cleaned_text, strict=False)
        except json.JSONDecodeError:
            pass
        
        return None
