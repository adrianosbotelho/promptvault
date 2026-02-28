"""
Prompt Templates.

Templates per specialization with a standard section structure.
Sections: Context, Objective, Environment, Constraints, Analysis Strategy,
Expected Output, Validation Checklist, Extra Instructions.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional

# Standard sections for all prompt templates (order preserved)
STANDARD_SECTIONS = [
    "context",
    "objective",
    "environment",
    "constraints",
    "analysis_strategy",
    "expected_output",
    "validation_checklist",
    "extra_instructions",
]

# Section headers (display / template labels)
SECTION_HEADERS = {
    "context": "# Context",
    "objective": "# Objective",
    "environment": "# Environment",
    "constraints": "# Constraints",
    "analysis_strategy": "# Analysis Strategy",
    "expected_output": "# Expected Output",
    "validation_checklist": "# Validation Checklist",
    "extra_instructions": "# Extra Instructions",
}


def _standard_template_body(intro: str, closing: str = "") -> str:
    """Build a template body with all standard sections as placeholders."""
    parts = [intro, ""]
    for key in STANDARD_SECTIONS:
        header = SECTION_HEADERS[key]
        parts.append(f"{header}\n{{{key}}}\n")
    if closing:
        parts.append(closing)
    return "\n".join(parts).strip()


@dataclass
class PromptTemplate:
    """A single prompt template with optional description."""

    id: str
    body: str
    description: str = ""
    required_vars: List[str] = field(default_factory=list)


class PromptTemplates:
    """
    Holds templates per specialization.
    All templates use the standard sections: Context, Objective, Environment,
    Constraints, Analysis Strategy, Expected Output, Validation Checklist, Extra Instructions.
    """

    _instance: Optional["PromptTemplates"] = None

    def __init__(self) -> None:
        self._by_spec: Dict[str, Dict[str, PromptTemplate]] = {}
        self._register_defaults()

    def _register_defaults(self) -> None:
        """Register default templates with standard section structure."""
        # Delphi
        self.add(
            "delphi",
            PromptTemplate(
                id="analysis",
                body=_standard_template_body(
                    "Você é um especialista em Delphi. Preencha as seções abaixo para guiar a análise.",
                    "Responda em português, de forma clara e objetiva.",
                ),
                description="Análise de código ou pergunta sobre Delphi",
                required_vars=list(STANDARD_SECTIONS),
            )
        )
        self.add(
            "delphi",
            PromptTemplate(
                id="flow",
                body=_standard_template_body(
                    "Descreva o fluxo completo da tela/componente Delphi. Inclua: eventos principais, chamadas de serviço, acesso a banco, pontos onde dados são modificados.",
                    "Responda em português.",
                ),
                description="Descrição de fluxo de tela Delphi",
                required_vars=list(STANDARD_SECTIONS),
            )
        )
        # Oracle
        self.add(
            "oracle",
            PromptTemplate(
                id="analysis",
                body=_standard_template_body(
                    "Você é um especialista em Oracle e PL/SQL. Use as seções abaixo para estruturar a análise.",
                    "Responda em português, com foco em clareza e boas práticas.",
                ),
                description="Análise ou dúvida sobre Oracle/SQL",
                required_vars=list(STANDARD_SECTIONS),
            )
        )
        self.add(
            "oracle",
            PromptTemplate(
                id="tuning",
                body=_standard_template_body(
                    "Analise o trecho Oracle para otimização. Sugira melhorias de performance (índices, plano de execução, boas práticas).",
                    "Responda em português.",
                ),
                description="Sugestões de tuning Oracle",
                required_vars=list(STANDARD_SECTIONS),
            )
        )
        # Arquitetura
        self.add(
            "arquitetura",
            PromptTemplate(
                id="analysis",
                body=_standard_template_body(
                    "Você é um arquiteto de software. Estruture a análise usando as seções abaixo.",
                    "Responda em português com análise técnica, trade-offs e recomendações.",
                ),
                description="Análise arquitetural",
                required_vars=list(STANDARD_SECTIONS),
            )
        )
        self.add(
            "arquitetura",
            PromptTemplate(
                id="decision",
                body=_standard_template_body(
                    "Avalie a decisão arquitetural. Apresente prós, contras, riscos e alternativas.",
                    "Responda em português.",
                ),
                description="Avaliação de decisão arquitetural",
                required_vars=list(STANDARD_SECTIONS),
            )
        )

    def add(self, specialization_id: str, template: PromptTemplate) -> None:
        """Add a template for a specialization."""
        if specialization_id not in self._by_spec:
            self._by_spec[specialization_id] = {}
        self._by_spec[specialization_id][template.id] = template

    def get(self, specialization_id: str, template_id: str) -> Optional[PromptTemplate]:
        """Get a template by specialization and template id. Returns None if not found."""
        if specialization_id not in self._by_spec:
            return None
        return self._by_spec[specialization_id].get(template_id)

    def get_or_raise(self, specialization_id: str, template_id: str) -> PromptTemplate:
        """Get a template. Raises KeyError if not found."""
        t = self.get(specialization_id, template_id)
        if t is None:
            raise KeyError(f"Template not found: {specialization_id}/{template_id}")
        return t

    def list_template_ids(self, specialization_id: str) -> List[str]:
        """List template ids for a specialization."""
        if specialization_id not in self._by_spec:
            return []
        return list(self._by_spec[specialization_id].keys())

    def list_templates(self, specialization_id: str) -> List[PromptTemplate]:
        """List all templates for a specialization."""
        if specialization_id not in self._by_spec:
            return []
        return list(self._by_spec[specialization_id].values())

    @classmethod
    def get_default(cls) -> "PromptTemplates":
        """Return the default singleton."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
