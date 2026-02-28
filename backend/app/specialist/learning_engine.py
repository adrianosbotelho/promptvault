"""
Learning Engine.

Simple in-memory learning: record usage/feedback and suggest best template.
Powerful: extend later with persistence or ML without changing the interface.
"""

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class UsageRecord:
    """A single usage/feedback record."""

    specialization_id: str
    template_id: str
    success: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)


class LearningEngine:
    """
    Tracks usage and suggests which template to use for a given context.

    Use:
        engine = LearningEngine.get_default()
        engine.record("delphi", "analysis", success=True)
        suggested = engine.suggest_template("delphi", context="fluxo de tela")
    """

    _instance: Optional["LearningEngine"] = None

    def __init__(self) -> None:
        # (spec_id, template_id) -> list of success counts / total
        self._usage: Dict[str, Dict[str, List[bool]]] = defaultdict(lambda: defaultdict(list))
        # optional: store last N records for richer suggestions
        self._max_records_per_key = 500

    def record(
        self,
        specialization_id: str,
        template_id: str,
        success: bool = True,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Record a usage (e.g. after user used a template and we got a result)."""
        self._usage[specialization_id][template_id].append(success)
        list_ref = self._usage[specialization_id][template_id]
        if len(list_ref) > self._max_records_per_key:
            list_ref[:] = list_ref[-self._max_records_per_key :]
        logger.debug(
            "LearningEngine.record spec=%s template=%s success=%s",
            specialization_id,
            template_id,
            success,
        )

    def record_usage(self, record: UsageRecord) -> None:
        """Record a UsageRecord."""
        self.record(
            record.specialization_id,
            record.template_id,
            success=record.success,
            metadata=record.metadata,
        )

    def suggest_template(
        self,
        specialization_id: str,
        context: Optional[str] = None,
        *,
        fallback_template_id: str = "analysis",
    ) -> str:
        """
        Suggest the best template id for this specialization (and optional context).

        Today: returns the template with the highest success rate for this spec.
        If no usage yet, returns fallback_template_id.

        Args:
            specialization_id: e.g. "delphi", "oracle"
            context: optional hint (future: use for semantic suggestion)
            fallback_template_id: template to return when there is no usage data

        Returns:
            Template id string (e.g. "analysis", "flow").
        """
        if specialization_id not in self._usage or not self._usage[specialization_id]:
            return fallback_template_id
        by_template = self._usage[specialization_id]
        best_id = fallback_template_id
        best_rate = -1.0
        for tid, outcomes in by_template.items():
            if not outcomes:
                continue
            rate = sum(1 for x in outcomes if x) / len(outcomes)
            if rate > best_rate:
                best_rate = rate
                best_id = tid
        return best_id

    def get_stats(self, specialization_id: str) -> Dict[str, Dict[str, Any]]:
        """Return usage stats per template for a specialization."""
        result: Dict[str, Dict[str, Any]] = {}
        if specialization_id not in self._usage:
            return result
        for template_id, outcomes in self._usage[specialization_id].items():
            total = len(outcomes)
            success_count = sum(1 for x in outcomes if x)
            result[template_id] = {
                "total": total,
                "success_count": success_count,
                "success_rate": success_count / total if total else 0.0,
            }
        return result

    def clear(self, specialization_id: Optional[str] = None) -> None:
        """Clear usage data (all or for one specialization). For tests."""
        if specialization_id is None:
            self._usage.clear()
        elif specialization_id in self._usage:
            del self._usage[specialization_id]

    @classmethod
    def get_default(cls) -> "LearningEngine":
        """Return default singleton."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
