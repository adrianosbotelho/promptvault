"""
Agent System Prompts.

System prompts for AI agents working with prompts in PromptVault.
"""

AGENT_SYSTEM_PROMPT = """You are an expert AI assistant specialized in prompt engineering and prompt management.

Your role is to help users create, improve, and manage AI prompts effectively. You have access to:
- The current prompt being worked on
- Similar prompts from the user's collection (found via semantic search)
- The latest prompts in the user's vault

Guidelines:
1. **Prompt Analysis**: Analyze prompts for clarity, structure, effectiveness, and best practices
2. **Improvement Suggestions**: Provide specific, actionable suggestions to improve prompts
3. **Context Awareness**: Use similar prompts and examples from the vault to inform your recommendations
4. **Best Practices**: Apply prompt engineering best practices:
   - Clear instructions and role definition
   - Proper formatting and structure
   - Specific output requirements
   - Examples when helpful
   - Error handling considerations
   - Token efficiency

5. **Consistency**: Maintain consistency with the user's existing prompt style when appropriate
6. **Versioning**: Understand that prompts are versioned and help users track improvements
7. **Semantic Understanding**: Leverage semantic search results to find relevant patterns and examples

When providing assistance:
- Be specific and actionable in your suggestions
- Explain the reasoning behind recommendations
- Reference similar prompts when relevant
- Consider the context and use case
- Balance improvement with maintaining the original intent
- Help users understand why certain changes improve the prompt

Always aim to help users create more effective, clear, and reliable prompts that produce better results from AI models."""


def build_agent_prompt_with_context(
    user_query: str,
    current_prompt_content: str = None,
    similar_prompts: list = None,
    latest_prompts: list = None
) -> str:
    """
    Build a complete prompt for the agent including context.
    
    Args:
        user_query: The user's question or request
        current_prompt_content: Content of the current prompt (if any)
        similar_prompts: List of similar prompts with similarity scores
        latest_prompts: List of latest prompts from the vault
        
    Returns:
        Complete prompt string ready to send to the LLM
    """
    prompt_parts = [AGENT_SYSTEM_PROMPT]
    prompt_parts.append("\n\n## Current Context\n")
    
    if current_prompt_content:
        prompt_parts.append("### Current Prompt\n")
        prompt_parts.append(f"```\n{current_prompt_content}\n```\n")
    
    if similar_prompts:
        prompt_parts.append(f"\n### Similar Prompts ({len(similar_prompts)} found)\n")
        for idx, similar in enumerate(similar_prompts, 1):
            similarity_pct = similar.similarity * 100
            prompt_parts.append(f"\n**{idx}. {similar.prompt.name}** (Similarity: {similarity_pct:.1f}%)\n")
            if similar.prompt.description:
                prompt_parts.append(f"Description: {similar.prompt.description}\n")
            
            # Get latest version content
            if similar.prompt.versions:
                latest_version = max(similar.prompt.versions, key=lambda v: v.version)
                prompt_parts.append(f"Content:\n```\n{latest_version.content}\n```\n")
    
    if latest_prompts:
        prompt_parts.append(f"\n### Latest Prompts in Vault ({len(latest_prompts)} most recent)\n")
        for idx, prompt in enumerate(latest_prompts[:5], 1):  # Show top 5
            prompt_parts.append(f"\n**{idx}. {prompt.name}**\n")
            if prompt.description:
                prompt_parts.append(f"Description: {prompt.description}\n")
            if prompt.versions:
                latest_version = max(prompt.versions, key=lambda v: v.version)
                content_preview = latest_version.content[:200] + "..." if len(latest_version.content) > 200 else latest_version.content
                prompt_parts.append(f"Content preview: {content_preview}\n")
    
    prompt_parts.append("\n\n## User Request\n")
    prompt_parts.append(user_query)
    
    return "\n".join(prompt_parts)


def build_simple_agent_prompt(user_query: str) -> str:
    """
    Build a simple agent prompt without context (for basic queries).
    
    Args:
        user_query: The user's question or request
        
    Returns:
        Complete prompt string
    """
    return f"{AGENT_SYSTEM_PROMPT}\n\n## User Request\n{user_query}"
