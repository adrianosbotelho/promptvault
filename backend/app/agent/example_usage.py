"""
Example usage of AgentContextBuilder.

This demonstrates how to use the AgentContextBuilder to gather context
for AI agents working with prompts.
"""
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.agent.agent_context import AgentContextBuilder


def example_usage():
    """Example of how to use AgentContextBuilder."""
    db: Session = SessionLocal()
    
    try:
        # Example 1: Build context for a specific prompt
        builder = AgentContextBuilder(db)
        context = (
            builder
            .with_current_prompt(prompt_id=1)  # Current prompt ID
            .with_similar_prompts(count=5)     # Get 5 similar prompts
            .with_latest_prompts(count=10)     # Get 10 latest prompts
            .build()
        )
        
        print(f"Current prompt: {context.current_prompt.name if context.current_prompt else 'None'}")
        print(f"Similar prompts: {len(context.similar_prompts)}")
        print(f"Latest prompts: {len(context.latest_prompts)}")
        
        # Example 2: Build context without a current prompt (just latest prompts)
        builder2 = AgentContextBuilder(db)
        context2 = (
            builder2
            .with_latest_prompts(count=20)
            .build()
        )
        
        print(f"\nLatest prompts only: {len(context2.latest_prompts)}")
        
        # Example 3: Build context with custom counts
        builder3 = AgentContextBuilder(db)
        context3 = (
            builder3
            .with_current_prompt(prompt_id=2)
            .with_similar_prompts(count=3)  # Only 3 similar prompts
            .with_latest_prompts(count=5)   # Only 5 latest prompts
            .build()
        )
        
        print(f"\nCustom context:")
        print(f"  Current: {context3.current_prompt.name if context3.current_prompt else 'None'}")
        print(f"  Similar: {len(context3.similar_prompts)}")
        print(f"  Latest: {len(context3.latest_prompts)}")
        
        # Access the context data
        if context.current_prompt:
            print(f"\nCurrent prompt versions: {len(context.current_prompt.versions)}")
            for version in context.current_prompt.versions:
                print(f"  Version {version.version}: {version.content[:50]}...")
        
        for similar in context.similar_prompts:
            print(f"\nSimilar prompt: {similar.prompt.name} (similarity: {similar.similarity:.2%})")
        
    finally:
        db.close()


if __name__ == "__main__":
    example_usage()
