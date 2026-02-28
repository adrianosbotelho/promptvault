"""
PromptRefiner — two-call LLM pipeline.

Pipeline:
  IDEIA BRUTA
       ↓
  Call 1: Expand  (max_tokens=500)
  Extract implicit context, identify gaps, enrich the idea
       ↓
  IDEIA EXPANDIDA
       ↓
  Call 2: Refine  (max_tokens=4000)
  Build professional structured prompt with mandatory sections
  using specialist mindset + REFINEMENT_STANDARD
       ↓
  PROMPT PROFISSIONAL (validated, with retry if sections missing)
"""

import logging
from typing import Any, Optional

from .refinement_standard import REFINEMENT_STANDARD, REQUIRED_SECTIONS
from .specialization_registry import SPECIALISTS

logger = logging.getLogger(__name__)

# System prompt for the expand step (Call 1)
_EXPAND_SYSTEM = """Você é um analista de contexto técnico.

Sua tarefa: ler uma ideia bruta de um desenvolvedor e extrair todo o contexto implícito.

SAÍDA: um parágrafo enriquecido (ou lista curta) que torna a ideia mais precisa.
- Identifique a tecnologia, componente ou objeto envolvido (mesmo que implícito)
- Nomeie o sintoma ou objetivo com mais precisão
- Traga à tona informações críticas que o usuário provavelmente sabe mas esqueceu de mencionar
- NÃO resolva o problema. NÃO dê recomendações.
- SEMPRE responda em Português do Brasil (pt-BR).
- Máximo de 150 palavras.
"""

_EXPAND_USER_TEMPLATE = """Ideia bruta do desenvolvedor:
---
{idea}
---

Produza a versão enriquecida. Retorne apenas o texto enriquecido, sem preâmbulo."""


def _build_refine_system(specialist_mindset: str) -> str:
    return f"""{REFINEMENT_STANDARD}

SPECIALIST CONTEXT:
{specialist_mindset}
"""


def _build_refine_user(expanded_idea: str) -> str:
    return f"""Transforme a ideia enriquecida abaixo em um prompt profissional e estruturado.

IDEIA ENRIQUECIDA:
---
{expanded_idea}
---

Retorne APENAS o prompt final em Markdown, usando exatamente as seções obrigatórias das suas instruções.
O prompt DEVE estar em Português do Brasil (pt-BR)."""


def _has_required_sections(text: str) -> bool:
    """Check that all mandatory sections are present in the output."""
    return all(section in text for section in REQUIRED_SECTIONS)


def _build_retry_user(expanded_idea: str, missing: list[str]) -> str:
    missing_str = "\n".join(f"- {s}" for s in missing)
    return f"""Sua resposta anterior estava faltando as seguintes seções obrigatórias:
{missing_str}

Reescreva o prompt completo do zero, garantindo que TODAS as seções obrigatórias estejam presentes.

IDEIA ENRIQUECIDA:
---
{expanded_idea}
---

Retorne APENAS o prompt final em Markdown com todas as seções obrigatórias, em Português do Brasil."""


class PromptRefiner:
    """
    Two-call LLM pipeline: expand raw idea → refine into professional structured prompt.

    When an llm_provider is available (supports async chat()):
      Call 1 (expand): enrich the raw idea with implicit context (fast, max_tokens=500)
      Call 2 (refine): build the professional prompt with mandatory sections (max_tokens=4000)
      Validation: check required sections; retry once if missing

    Fallback (no LLM): returns system+user prompts for single-call use (legacy behaviour).
    """

    def build(self, idea: str, specialization: str) -> dict:
        """
        Legacy single-call build: returns system + user prompts.
        Used by the endpoint when calling llm_provider.chat() directly.
        Kept for backward compatibility.
        """
        specialist = SPECIALISTS[specialization]
        system = _build_refine_system(specialist.specialist_mindset)
        user = _build_refine_user(idea)
        return {"system": system, "user": user}

    async def build_async(
        self,
        idea: str,
        specialization: str,
        llm_provider: Optional[Any] = None,
    ) -> str:
        """
        Full two-call pipeline. Returns the final professional prompt as a string.

        If llm_provider is None or does not support chat(), falls back to a
        single-call build and returns the user prompt template (no LLM call).
        """
        if llm_provider is None or not callable(getattr(llm_provider, "chat", None)):
            prompts = self.build(idea, specialization)
            return prompts["user"].strip()

        specialist = SPECIALISTS[specialization]

        # ——— Call 1: Expand ———
        expanded_idea = idea
        try:
            expanded_idea = await llm_provider.chat(
                _EXPAND_SYSTEM,
                _EXPAND_USER_TEMPLATE.format(idea=idea),
                max_tokens=500,
            )
            expanded_idea = (expanded_idea or "").strip() or idea
            logger.debug("Expand step produced: %s", expanded_idea[:200])
        except Exception as e:
            logger.warning("Expand step failed, using raw idea: %s", e)
            expanded_idea = idea

        # ——— Call 2: Refine ———
        refine_system = _build_refine_system(specialist.specialist_mindset)
        refine_user = _build_refine_user(expanded_idea)

        result = ""
        try:
            result = await llm_provider.chat(
                refine_system,
                refine_user,
                max_tokens=4000,
            )
            result = (result or "").strip()
        except Exception as e:
            logger.warning("Refine step failed: %s", e)
            return _build_refine_user(expanded_idea).strip()

        # ——— Validation + Retry ———
        if not _has_required_sections(result):
            missing = [s for s in REQUIRED_SECTIONS if s not in result]
            logger.info("Output missing sections %s — retrying once", missing)
            try:
                retry_result = await llm_provider.chat(
                    refine_system,
                    _build_retry_user(expanded_idea, missing),
                    max_tokens=4000,
                )
                retry_result = (retry_result or "").strip()
                if retry_result and _has_required_sections(retry_result):
                    result = retry_result
                    logger.info("Retry produced valid output with all required sections")
                else:
                    logger.warning("Retry still missing sections — keeping first result")
            except Exception as e:
                logger.warning("Retry step failed: %s", e)

        return result
