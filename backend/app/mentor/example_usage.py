"""
Example usage of DecisionExtractor.

This module demonstrates how to use DecisionExtractor to extract
architectural decisions from prompt content.
"""

import asyncio
import logging
from app.mentor.decision_extractor import DecisionExtractor, ArchitecturalDecision
from app.core.dependencies import get_llm_provider

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def example_extract_decisions():
    """Example: Extract architectural decisions from a prompt."""
    
    # Initialize extractor
    llm_provider = get_llm_provider()
    extractor = DecisionExtractor(llm_provider=llm_provider)
    
    # Example prompt content
    prompt_content = """
    I'm implementing a new service layer for handling user authentication.
    I've decided to use async/await for all database operations to improve
    performance. I've also separated the authentication logic into a dedicated
    service class to improve maintainability. The SQL queries have been optimized
    with proper indexing to reduce query time.
    """
    
    # Extract decisions
    decisions = await extractor.extract_decisions(
        prompt_content=prompt_content,
        max_decisions=10
    )
    
    # Display results
    print(f"\nExtracted {len(decisions)} architectural decisions:\n")
    for i, decision in enumerate(decisions, 1):
        print(f"{i}. Type: {decision.decision_type}")
        print(f"   Description: {decision.description}")
        if decision.rationale:
            print(f"   Rationale: {decision.rationale}")
        print(f"   Confidence: {decision.confidence:.2f}")
        if decision.context:
            print(f"   Context: {decision.context}")
        print()


if __name__ == "__main__":
    asyncio.run(example_extract_decisions())
