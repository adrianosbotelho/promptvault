"""
Prompt Compiler.

Pipeline:
  IDEIA + SPECIALIST
       ↓
  Context Expansion   — expand raw idea into objective + context hints
       ↓
  Template Injection  — inject into fixed 9-section structure (Objective, Context, …)
       ↓
  LLM Refinement     — LLM fills/refines each section with concrete content (when provider available)
       ↓
  Professional Markdown — final structured prompt output
"""

import json
import logging
import re
from dataclasses import dataclass
from typing import Any, Optional

from app.specialist.specialization_registry import Specialization, SpecializationRegistry, SPECIALISTS
from app.specialist.expert_fill_instructions import (
    build_expert_fill_system,
    build_expert_fill_user,
)

logger = logging.getLogger(__name__)


# All specialist prompts must follow this section structure (order preserved)
EXPERT_SECTION_HEADERS = [
    ("objective", "# 🎯 Objective"),
    ("context", "# 📌 Context"),
    ("problem_description", "# 🧩 Problem Description"),
    ("analysis_strategy", "# 🔎 Analysis Strategy"),
    ("technical_steps", "# ⚙️ Technical Steps"),
    ("edge_cases", "# ⚠️ Edge Cases"),
    ("validation_checklist", "# ✅ Validation Checklist"),
    ("expected_result", "# 📊 Expected Result"),
    ("expert_notes", "# 🧠 Expert Notes"),
]


@dataclass
class CompilerResult:
    """Output of PromptCompiler.compile."""

    markdown_prompt: str
    reasoning_summary: str


class PromptCompiler:
    """
    Compiles raw idea + specialization into an expert-level structured markdown prompt.

    Pipeline: Context Expansion → Template Injection → LLM Refinement → Professional Markdown.
    Output: markdown_prompt, reasoning_summary.
    """

    def __init__(self, registry: Optional[SpecializationRegistry] = None) -> None:
        self._registry = registry or SpecializationRegistry.get_default()

    def build(self, idea: str, specialization: str) -> dict:
        """Build system + user prompts for execution protocol from idea and specialization key."""
        specialist = SPECIALISTS[specialization]
        system_prompt = specialist.build_system_prompt()
        user_prompt = f"""
ENGINEERING PROBLEM:

{idea}

Produce execution protocol.
"""
        return {
            "system": system_prompt,
            "user": user_prompt,
        }

    def compile(
        self,
        raw_idea: str,
        specialization_id: str,
        *,
        context_hint: str = "",
    ) -> CompilerResult:
        """
        Compile raw idea and specialization into a structured markdown prompt.

        Args:
            raw_idea: User's raw idea or request.
            specialization_id: e.g. "delphi_debug", "plsql_refactor".
            context_hint: Optional prefill for Context section.

        Returns:
            CompilerResult with markdown_prompt and reasoning_summary.

        Raises:
            KeyError: If specialization_id is not registered.
        """
        spec = self._registry.get_or_raise(specialization_id)
        objective_text = self._expand_idea_context(raw_idea)
        system_content = self._build_system_content(spec)
        sections = self._inject_template(
            spec=spec,
            objective=objective_text,
            context_hint=context_hint,
            system_content=system_content,
        )
        markdown_prompt = self._render_markdown(spec, sections)
        reasoning_summary = self._build_reasoning_summary(spec, raw_idea)

        return CompilerResult(
            markdown_prompt=markdown_prompt,
            reasoning_summary=reasoning_summary,
        )

    async def compile_async(
        self,
        raw_idea: str,
        specialization_id: str,
        *,
        llm_provider: Optional[Any] = None,
        context_hint: str = "",
    ) -> CompilerResult:
        """
        Full pipeline: Context Expansion → Template Injection → LLM Refinement → Professional Markdown.
        When llm_provider supports chat(), LLM Refinement fills all sections; otherwise template placeholders are kept.
        """
        spec = self._registry.get_or_raise(specialization_id)

        # ——— 1. Context Expansion ———
        objective_text = self._expand_idea_context(raw_idea)
        system_content = self._build_system_content(spec)

        # ——— 2. Template Injection ———
        sections = self._inject_template(
            spec=spec,
            objective=objective_text,
            context_hint=context_hint,
            system_content=system_content,
        )

        # ——— 3. LLM Refinement ———
        used_llm = False
        if llm_provider is not None and callable(getattr(llm_provider, "chat", None)):
            try:
                refined = await self._refine_with_llm(
                    raw_idea=raw_idea,
                    spec=spec,
                    sections=sections,
                    system_content=system_content,
                    llm_provider=llm_provider,
                )
                if refined is not None:
                    sections = refined
                    used_llm = True
            except Exception as e:
                logger.warning("LLM Refinement failed, keeping template: %s", e)

        # ——— 4. Professional Markdown ———
        markdown_prompt = self._render_markdown(spec, sections)
        reasoning_summary = self._build_reasoning_summary(spec, raw_idea, used_llm=used_llm)
        return CompilerResult(
            markdown_prompt=markdown_prompt,
            reasoning_summary=reasoning_summary,
        )

    def _parse_expert_fill_json(self, text: str) -> Optional[dict]:
        """Extract and parse JSON from LLM response; strip optional markdown code fence."""
        if not (text or isinstance(text, str)):
            return None
        raw = text.strip()
        # Remove ```json ... ``` or ``` ... ```
        match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", raw)
        if match:
            raw = match.group(1).strip()
        try:
            data = json.loads(raw)
            if isinstance(data, dict):
                return data
        except json.JSONDecodeError:
            pass
        return None

    def _expand_idea_context(self, raw_idea: str) -> str:
        """Pipeline step 1 (Context Expansion): raw idea → clear objective sentence."""
        idea = (raw_idea or "").strip()
        if not idea:
            return "(Objetivo não especificado. Descreva aqui o que deseja obter.)"
        if not idea.endswith((".", "!", "?")):
            idea = idea + "."
        return idea

    def _build_system_content(self, spec: Specialization) -> str:
        """Pipeline step 1 (Context Expansion): specialization → expert notes content."""
        parts = [
            f"**Domínio:** {spec.domain}",
            "",
            f"**Meta:** {spec.goal}",
            "",
            f"**Abordagem:** {spec.thinking_style}",
        ]
        return "\n".join(parts)

    def _normalize_section_value(self, value: Any) -> str:
        """Ensure section value is a string (LLM sometimes returns list for checklists)."""
        if value is None:
            return ""
        if isinstance(value, str):
            return value.strip()
        if isinstance(value, list):
            return "\n".join(str(item).strip() for item in value if item is not None).strip()
        return str(value).strip()

    async def _refine_with_llm(
        self,
        raw_idea: str,
        spec: Specialization,
        sections: dict,
        system_content: str,
        llm_provider: Any,
    ) -> Optional[dict]:
        """Pipeline step 3: LLM Refinement — fill all sections with concrete content. Returns None on failure."""
        system_prompt = build_expert_fill_system(
            spec.name, spec.domain, spec.goal, spec.thinking_style
        )
        user_prompt = build_expert_fill_user(raw_idea)
        response = await llm_provider.chat(system_prompt, user_prompt, max_tokens=4000)
        filled = self._parse_expert_fill_json(response)
        if not filled:
            return None
        return {
            "objective": sections.get("objective", ""),
            "context": self._normalize_section_value(filled.get("context")),
            "problem_description": self._normalize_section_value(filled.get("problem_description")),
            "analysis_strategy": self._normalize_section_value(filled.get("analysis_strategy")),
            "technical_steps": self._normalize_section_value(filled.get("technical_steps")),
            "edge_cases": self._normalize_section_value(filled.get("edge_cases")),
            "validation_checklist": self._normalize_section_value(filled.get("validation_checklist")),
            "expected_result": self._normalize_section_value(filled.get("expected_result")),
            "expert_notes": system_content,
        }

    def _inject_template(
        self,
        spec: Specialization,
        objective: str,
        context_hint: str,
        system_content: str,
    ) -> dict:
        """Pipeline step 2: Template Injection — 9-section structure with expanded context and placeholders."""
        return {
            "objective": objective,
            "context": context_hint.strip()
            or "Descreva o cenário, sistema ou código relevante. (Ex.: ambiente, versões, restrições.)",
            "problem_description": (
                "Descreva o problema ou a tarefa de forma precisa. "
                "Inclua sintomas, trechos relevantes ou requisitos."
            ),
            "analysis_strategy": (
                "Passos para analisar o problema: o que verificar primeiro, "
                "quais dados capturar, como isolar a causa."
            ),
            "technical_steps": (
                "Sequência técnica recomendada: etapas concretas, "
                "comandos ou alterações a aplicar, em ordem."
            ),
            "edge_cases": (
                "Casos limite, exceções ou condições especiais a considerar "
                "e como tratá-las."
            ),
            "validation_checklist": (
                "- Resultado está correto e completo?\n"
                "- Comportamento esperado verificado?\n"
                "- Regressões ou efeitos colaterais descartados?"
            ),
            "expected_result": (
                "Formato e conteúdo esperados da resposta: "
                "exemplo de saída, métricas ou critérios de sucesso."
            ),
            "expert_notes": system_content,
        }

    def _render_markdown(self, spec: Specialization, sections: dict) -> str:
        """Pipeline step 4: Professional Markdown — render final structured prompt."""
        lines = [
            f"# Especialista: {spec.name}",
            "",
            "---",
            "",
        ]
        for key, header in EXPERT_SECTION_HEADERS:
            value = (sections.get(key) or "").strip() or "_A preencher._"
            lines.append(header)
            lines.append("")
            lines.append(value)
            lines.append("")
        return "\n".join(lines).strip()

    def _build_reasoning_summary(
        self, spec: Specialization, raw_idea: str, *, used_llm: bool = False
    ) -> str:
        """Build a short reasoning summary for the response."""
        if used_llm:
            return (
                f"Prompt gerado pelo especialista **{spec.name}** (domínio: {spec.domain}). "
                "Todas as seções foram preenchidas com conteúdo concreto pelo modelo; "
                "Objective com sua ideia; Expert Notes com meta e abordagem da especialização."
            )
        return (
            f"Prompt compilado para **{spec.name}** (domínio: {spec.domain}). "
            f"Ideia expandida como Objective; template com 9 seções aplicado; "
            f"instruções por seção para remover ambiguidade; Expert Notes com meta e abordagem da especialização."
        )
