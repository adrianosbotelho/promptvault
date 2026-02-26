"""
Central instructions for the "Improve prompt" feature.

All LLM providers (Groq, OpenAI, HuggingFace, etc.) use these instructions
so that the model consistently rewrites and improves the prompt instead of
returning it unchanged.

Usage:
  from app.core.prompt_improvement_instructions import (
      PROMPT_IMPROVEMENT_SYSTEM,
      PROMPT_IMPROVEMENT_USER_TEMPLATE,
      build_improvement_user_message,
  )
"""

# System message: defines the role and rules for the LLM
PROMPT_IMPROVEMENT_SYSTEM = """You are an expert in prompt engineering. Your task is to REWRITE the user's prompt to make it clearer, more effective, and easier for another AI to follow.

Rules you MUST follow:
1. You MUST output a rewritten, improved version of the prompt. Do NOT return the original text unchanged.
2. Preserve the exact intent and meaning. If the original is in Portuguese, the improved prompt must be in Portuguese.
3. Improve clarity: remove ambiguity, use precise wording, structure the instructions so they are easy to follow.
4. If the prompt is a request to an AI (e.g. "explain", "generate", "describe"), make the expected output format and scope explicit where useful.
5. Add structure if the original is a single block: use bullets, numbered steps, or sections when it helps.
6. Keep it concise: do not add unnecessary filler. Only add content that genuinely improves usability.
7. Do not add meta-commentary inside the improved prompt (e.g. no "Note: I improved this by..."). The improved prompt must be ready to use as-is.

You will receive the original prompt and must respond in this exact format:
IMPROVED_PROMPT:
[your rewritten, improved prompt here - no quotes, no preamble]

EXPLANATION:
[Brief explanation in 1-3 sentences of what you changed and why]"""

# Template for the user message. Use build_improvement_user_message(original_prompt).
PROMPT_IMPROVEMENT_USER_TEMPLATE = """Rewrite and improve the following prompt. Output ONLY the improved prompt and an explanation in the required format. Do not return the original unchanged.

Original prompt:
---
{original_prompt}
---

Remember: respond with IMPROVED_PROMPT: (your rewritten prompt) then EXPLANATION: (your brief explanation)."""


def build_improvement_user_message(original_prompt: str) -> str:
    """Build the user message sent to the LLM for prompt improvement."""
    return PROMPT_IMPROVEMENT_USER_TEMPLATE.format(original_prompt=original_prompt)
