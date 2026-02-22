"""
Example usage of AgentService.

This demonstrates how to use the AgentService to get structured suggestions
for prompts.
"""
import asyncio
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.agent.agent_service import AgentService


async def example_agent_service():
    """Example of how to use AgentService."""
    db: Session = SessionLocal()
    
    try:
        # Initialize service
        agent_service = AgentService(db)
        
        # Get suggestions for a specific prompt
        print("Getting suggestions for prompt ID 1...")
        suggestions = await agent_service.get_suggestions(
            prompt_id=1,
            user_query="Analyze this prompt and provide suggestions for improvements, reusable patterns, and any warnings.",
            similar_count=5,
            latest_count=10
        )
        
        print(f"\n=== Improvement Ideas ({len(suggestions.improvement_ideas)}) ===")
        for idea in suggestions.improvement_ideas:
            print(f"\n[{idea.priority.upper()}] {idea.title}")
            print(f"  {idea.description}")
            print(f"  Reasoning: {idea.reasoning}")
        
        print(f"\n=== Reusable Patterns ({len(suggestions.reusable_patterns)}) ===")
        for pattern in suggestions.reusable_patterns:
            print(f"\n{pattern.name}")
            print(f"  {pattern.description}")
            print(f"  Example: {pattern.example}")
            print(f"  Use cases: {', '.join(pattern.use_cases)}")
        
        print(f"\n=== Warnings ({len(suggestions.warnings)}) ===")
        for warning in suggestions.warnings:
            print(f"\n[{warning.severity.upper()}] {warning.message}")
            if warning.suggestion:
                print(f"  Suggestion: {warning.suggestion}")
        
        # Example 2: Get suggestions without a specific prompt
        print("\n\n=== Getting general suggestions ===")
        general_suggestions = await agent_service.get_suggestions(
            user_query="What are some common patterns I should use in my prompts?",
            latest_count=5
        )
        
        print(f"Found {len(general_suggestions.reusable_patterns)} reusable patterns")
        
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(example_agent_service())
