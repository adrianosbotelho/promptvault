"""
Specialization Registry.

Defines all available prompt specializations.
Each specialization contains: name, domain, goal, thinking style, required sections.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional

from .delphi_debug import DelphiDebugSpecialist
from .delphi_refactor import DelphiRefactorSpecialist
from .delphi_architecture import DelphiArchitectureSpecialist
from .plsql_debug import PLSQLDebugSpecialist
from .plsql_refactor import PLSQLRefactorSpecialist
from .plsql_architecture import PLSQLArchitectureSpecialist
from .python_debug import PythonDebugSpecialist
from .python_refactor import PythonRefactorSpecialist
from .sql_query import SQLQuerySpecialist
from .api_design import APIDesignSpecialist

SPECIALISTS = {
    "delphi_debug": DelphiDebugSpecialist(),
    "delphi_refactor": DelphiRefactorSpecialist(),
    "delphi_architecture": DelphiArchitectureSpecialist(),
    "plsql_debug": PLSQLDebugSpecialist(),
    "plsql_refactor": PLSQLRefactorSpecialist(),
    "plsql_architecture": PLSQLArchitectureSpecialist(),
    "python_debug": PythonDebugSpecialist(),
    "python_refactor": PythonRefactorSpecialist(),
    "sql_query": SQLQuerySpecialist(),
    "api_design": APIDesignSpecialist(),
}


@dataclass
class Specialization:
    """A single prompt specialization."""

    id: str
    name: str
    domain: str
    goal: str
    thinking_style: str
    required_sections: List[str] = field(default_factory=list)

    def __str__(self) -> str:
        return self.id


class SpecializationRegistry:
    """
    Registry of all available prompt specializations.

    Use:
        registry = SpecializationRegistry.get_default()
        spec = registry.get("delphi")
        all_ids = registry.list_ids()
    """

    _instance: Optional["SpecializationRegistry"] = None

    def __init__(self) -> None:
        self._specializations: Dict[str, Specialization] = {}
        self._register_defaults()

    def _register_defaults(self) -> None:
        """Register built-in specializations."""
        # Delphi family
        self.register(
            Specialization(
                id="delphi",
                name="Delphi",
                domain="Delphi, Object Pascal, VCL/FMX, Embarcadero ecosystem",
                goal="Produce clear, maintainable Delphi code and designs; explain flows, patterns, and best practices for desktop and data access.",
                thinking_style="Step-by-step: identify components and events first, then data flow and side effects. Prefer concrete examples and code snippets. Stay aligned with VCL/FMX idioms.",
                required_sections=["context", "scope", "expected_output", "constraints"],
            )
        )
        self.register(
            Specialization(
                id="delphi_debug",
                name="Delphi Debug",
                domain="Delphi debugging, exceptions, diagnostics, VCL/FMX behavior",
                goal="Help locate and fix bugs in Delphi code; explain runtime behavior, exception handling, and diagnostic steps.",
                thinking_style="Reproduce first: steps to trigger the issue, then isolate (component, event, data). Check stack, breakpoints, and logs. Suggest minimal fixes and verify.",
                required_sections=["context", "scope", "expected_output", "constraints"],
            )
        )
        self.register(
            Specialization(
                id="delphi_refactor",
                name="Delphi Refactor",
                domain="Delphi refactoring, code quality, patterns, legacy modernization",
                goal="Improve Delphi code structure and maintainability without changing behavior; suggest safe refactors and patterns.",
                thinking_style="Understand current behavior first, then propose small steps: extract methods, introduce interfaces, reduce coupling. Preserve semantics and testability.",
                required_sections=["context", "scope", "expected_output", "constraints"],
            )
        )
        self.register(
            Specialization(
                id="delphi_architecture",
                name="Delphi Architecture",
                domain="Delphi architecture, layered design, modules, dependencies",
                goal="Design or review Delphi architecture: layers, modules, dependencies, and integration with DB/Services.",
                thinking_style="Structure-first: boundaries, responsibilities, and data flow. Align with VCL/FMX patterns and avoid circular dependencies.",
                required_sections=["context", "problem_or_decision", "constraints", "expected_artifact"],
            )
        )
        # Oracle / PLSQL family
        self.register(
            Specialization(
                id="oracle",
                name="Oracle",
                domain="Oracle Database, PL/SQL, SQL, tuning, data modeling",
                goal="Deliver correct, performant SQL/PL-SQL and schema advice; explain execution plans, indexing, and transactional behavior.",
                thinking_style="Data-first: clarify tables and relationships, then query intent and volume. Consider locking, indexes, and execution plans. Prefer set-based logic and explicit standards.",
                required_sections=["context", "schema_or_objects", "expected_result", "performance_notes"],
            )
        )
        self.register(
            Specialization(
                id="plsql_debug",
                name="PLSQL Debug",
                domain="PL/SQL debugging, performance diagnosis, execution plans, tuning",
                goal="Identify root causes of poor PL/SQL performance; suggest concrete fixes (indexes, rewrites, hints, session/DB config) with evidence from execution plans and traces.",
                thinking_style="Diagnose first: reproduce the issue, capture execution plan and metrics, then isolate bottleneck (SQL vs. PL logic, I/O, locks). Propose one change at a time with before/after rationale.",
                required_sections=["context", "schema_or_objects", "expected_result", "performance_notes"],
            )
        )
        self.register(
            Specialization(
                id="plsql_refactor",
                name="PLSQL Refactor",
                domain="PL/SQL refactoring, code quality, packages, reuse",
                goal="Improve PL/SQL structure and maintainability: extract procedures, reduce duplication, improve naming and error handling.",
                thinking_style="Preserve behavior: identify invariants and tests, then refactor in small steps. Prefer packages and clear contracts; document side effects.",
                required_sections=["context", "schema_or_objects", "expected_result", "performance_notes"],
            )
        )
        self.register(
            Specialization(
                id="plsql_architecture",
                name="PLSQL Architecture",
                domain="PL/SQL architecture, schema design, API design, integration",
                goal="Design or review PL/SQL architecture: package structure, schema boundaries, API contracts, and integration patterns.",
                thinking_style="Structure-first: layers (data vs. business vs. API), dependencies, and transaction boundaries. Consider security and performance.",
                required_sections=["context", "schema_or_objects", "constraints", "expected_artifact"],
            )
        )
        self.register(
            Specialization(
                id="arquitetura",
                name="Arquitetura de Software",
                domain="Software architecture, design patterns, technical decisions, trade-offs",
                goal="Support sound architectural decisions with clear trade-offs, risks, and alternatives; improve consistency and long-term maintainability.",
                thinking_style="Structure-first: state context and constraints, then options with pros/cons. Explicitly call out risks and migration paths. Prefer diagrams or bullet lists when useful.",
                required_sections=["context", "problem_or_decision", "constraints", "expected_artifact"],
            )
        )

    def register(self, spec: Specialization) -> None:
        """Register a specialization (overwrites if id exists)."""
        self._specializations[spec.id] = spec

    def get(self, specialization_id: str) -> Optional[Specialization]:
        """Get a specialization by id. Returns None if not found."""
        return self._specializations.get(specialization_id)

    def get_or_raise(self, specialization_id: str) -> Specialization:
        """Get a specialization by id. Raises KeyError if not found."""
        spec = self.get(specialization_id)
        if spec is None:
            raise KeyError(f"Specialization not found: {specialization_id}")
        return spec

    def list_ids(self) -> List[str]:
        """Return all registered specialization ids."""
        return list(self._specializations.keys())

    def list_all(self) -> List[Specialization]:
        """Return all registered specializations."""
        return list(self._specializations.values())

    def exists(self, specialization_id: str) -> bool:
        """Check if a specialization is registered."""
        return specialization_id in self._specializations

    @classmethod
    def get_default(cls) -> "SpecializationRegistry":
        """Return the default singleton registry."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
