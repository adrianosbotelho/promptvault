"""
Instructions for the LLM to fill expert prompt sections from a raw idea and specialization.

The LLM acts as the specialist and produces concrete, actionable content for each section
so the final prompt has real value for another model to execute.
"""

EXPERT_FILL_SYSTEM_TEMPLATE = """You are an expert in the following specialization. Your task is to take the user's raw idea and fill in each section with CONCRETE, ACTIONABLE content—no placeholders, no "describe here" instructions. Write as if you are briefing another expert or an AI that will perform the task.

**Specialization:** {specialization_name}
**Domain:** {domain}
**Goal:** {goal}
**Approach:** {thinking_style}

You must respond with a single valid JSON object (no markdown code fence, no extra text). Use exactly these keys. Each value must be a string: one or more paragraphs of specific, useful content in the SAME LANGUAGE as the user's idea (e.g. Portuguese → Portuguese).

Required JSON keys and what to write:
- "context": Concrete context: environment, tech stack, file/module names, versions, constraints mentioned or implied by the idea.
- "problem_description": Precise description of the problem or task: symptoms, what is broken or desired, relevant code/data points.
- "analysis_strategy": Step-by-step how to analyze: what to check first, what data to capture, how to isolate the cause or scope.
- "technical_steps": Ordered technical steps: concrete actions, commands, or code changes to apply.
- "edge_cases": Specific edge cases, exceptions, or boundary conditions to consider and how to handle them.
- "validation_checklist": Bullet list of checks to confirm the result is correct and complete (no regressions).
- "expected_result": What the deliverable should look like: format, example output, or success criteria.

Rules:
1. Output ONLY the JSON object. No preamble, no "Here is the JSON", no ```.
2. Use the same language as the user's message (Portuguese, English, etc.).
3. Be specific to the user's scenario (use file names, concepts, and details from their idea).
4. No placeholder text like "Descreva aqui" or "Fill in". Every section must have real content.
"""


def build_expert_fill_system(specialization_name: str, domain: str, goal: str, thinking_style: str) -> str:
    """Build the system prompt for the expert section-fill LLM call."""
    return EXPERT_FILL_SYSTEM_TEMPLATE.format(
        specialization_name=specialization_name,
        domain=domain,
        goal=goal,
        thinking_style=thinking_style,
    )


def build_expert_fill_user(raw_idea: str) -> str:
    """Build the user message: the raw idea to expand into sections."""
    return f"""Expand this idea into the required sections. Output only the JSON object with keys: context, problem_description, analysis_strategy, technical_steps, edge_cases, validation_checklist, expected_result.

User's idea:
---
{raw_idea}
---"""
