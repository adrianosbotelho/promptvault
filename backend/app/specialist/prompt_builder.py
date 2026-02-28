"""
Prompt Builder.

Transforms a simple idea + specialization into a professional, structured
markdown prompt with no ambiguity and domain-specific reasoning.
"""

import re
from typing import Any, Dict, Optional

from app.specialist.prompt_templates import (
    PromptTemplates,
    STANDARD_SECTIONS,
    SECTION_HEADERS,
)
from app.specialist.specialization_registry import Specialization, SpecializationRegistry


class PromptBuilder:
    """
    Builds a professional structured markdown prompt from a simple idea and specialization.

    Input: simple idea (raw user intent), specialization (domain)
    Output: markdown prompt with clear sections, domain-specific reasoning, no ambiguity.

    Use:
        builder = PromptBuilder.get_default()
        prompt_md = builder.build_from_idea("explain login flow", "delphi")
    """

    _instance: Optional["PromptBuilder"] = None

    def __init__(
        self,
        registry: Optional[SpecializationRegistry] = None,
        templates: Optional[PromptTemplates] = None,
    ) -> None:
        self._registry = registry or SpecializationRegistry.get_default()
        self._templates = templates or PromptTemplates.get_default()

    def build_from_idea(
        self,
        simple_idea: str,
        specialization_id: str,
        *,
        context: str = "",
        language: str = "pt-BR",
        **section_overrides: str,
    ) -> str:
        """
        Build a professional, structured markdown prompt from a simple idea and specialization.

        Input:
            simple_idea: The user's raw intent (e.g. "explain login flow", "optimize this query").
            specialization_id: Domain (e.g. "delphi", "oracle", "arquitetura").

        Output:
            Markdown prompt with: role/domain, goal, reasoning style, and all standard sections
            filled with domain-specific guidance and the idea as objective. No ambiguity.

        Optional:
            context: Prefill for Context section.
            language: e.g. "pt-BR" (included in Extra Instructions).
            **section_overrides: Override any section by name (context, objective, constraints, ...).
        """
        spec = self._registry.get_or_raise(specialization_id)
        idea = (simple_idea or "").strip() or "(objetivo não especificado)"
        sections = self._domain_section_content(spec, idea, context, language)
        sections.update(section_overrides)
        return self._render_markdown(spec, sections)

    def _domain_section_content(
        self,
        spec: Specialization,
        objective: str,
        context: str,
        language: str,
    ) -> Dict[str, str]:
        """Build domain-specific content for each standard section."""
        return {
            "context": context or "Descreva o cenário, sistema ou código relevante para esta solicitação.",
            "objective": objective,
            "environment": "Ferramentas, versões e ambiente relevantes (ex.: Delphi 11, VCL; Oracle 19c; stack do projeto).",
            "constraints": "Restrições técnicas ou de negócio que a resposta deve respeitar.",
            "analysis_strategy": spec.thinking_style,
            "expected_output": (
                f"Resultado esperado alinhado ao domínio: {spec.domain}. "
                f"Meta: {spec.goal}"
            ),
            "validation_checklist": (
                "- Resposta completa e diretamente utilizável?\n"
                "- Consistente com o domínio e as restrições?\n"
                "- Formato e idioma conforme solicitado?"
            ),
            "extra_instructions": f"Idioma: {language}. Seja explícito e evite ambiguidade.",
        }

    def _render_markdown(self, spec: Specialization, sections: Dict[str, str]) -> str:
        """Render full markdown prompt with role, domain, goal, and sections."""
        lines = [
            f"# Especialista: {spec.name}",
            "",
            f"**Domínio:** {spec.domain}",
            "",
            f"**Meta:** {spec.goal}",
            "",
            "---",
            "",
        ]
        for key in STANDARD_SECTIONS:
            header = SECTION_HEADERS[key]
            value = (sections.get(key) or "").strip()
            lines.append(header)
            lines.append("")
            lines.append(value if value else "_A preencher._")
            lines.append("")
        return "\n".join(lines).strip()

    # --- Legacy: template-based build (for callers that need template_id) ---

    def build(
        self,
        specialization_id: str,
        template_id: str,
        variables: Optional[Dict[str, Any]] = None,
        *,
        default_missing: str = "",
    ) -> str:
        """
        Build prompt from a template and variables (legacy).
        Prefer build_from_idea for simple idea + specialization.
        """
        template = self._templates.get_or_raise(specialization_id, template_id)
        variables = variables or {}
        text = template.body
        for key in re.findall(r"\{(\w+)\}", text):
            value = variables.get(key, default_missing)
            if not isinstance(value, str):
                value = str(value)
            text = text.replace("{" + key + "}", value)
        return text

    def build_with_defaults(
        self,
        specialization_id: str,
        template_id: str,
        user_input: str,
        context: str = "",
        extra: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Convenience: build from template with user_input and context.
        Prefer build_from_idea for new code.
        """
        vars_: Dict[str, Any] = {
            "context": context or "",
            "objective": user_input,
            "environment": "",
            "constraints": "",
            "analysis_strategy": "",
            "expected_output": "",
            "validation_checklist": "",
            "extra_instructions": "",
        }
        if extra:
            for k in STANDARD_SECTIONS:
                if k in extra:
                    vars_[k] = extra[k]
        return self.build(specialization_id, template_id, vars_)

    @classmethod
    def get_default(cls) -> "PromptBuilder":
        """Return default builder (singleton)."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
