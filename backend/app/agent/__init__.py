"""
Agent module for building context and working with prompts.
"""
from app.agent.agent_context import AgentContext, AgentContextBuilder, SimilarPrompt
from app.agent.agent_prompts import (
    AGENT_SYSTEM_PROMPT,
    build_agent_prompt_with_context,
    build_simple_agent_prompt
)
from app.agent.agent_service import (
    AgentService,
    AgentSuggestions,
    ImprovementIdea,
    ReusablePattern,
    Warning
)

__all__ = [
    'AgentContext',
    'AgentContextBuilder',
    'SimilarPrompt',
    'AGENT_SYSTEM_PROMPT',
    'build_agent_prompt_with_context',
    'build_simple_agent_prompt',
    'AgentService',
    'AgentSuggestions',
    'ImprovementIdea',
    'ReusablePattern',
    'Warning'
]
