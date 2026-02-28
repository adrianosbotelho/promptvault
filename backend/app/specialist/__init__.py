"""
Specialist module.

Simple and powerful architecture:
- SpecializationRegistry: register and lookup specializations (delphi, oracle, arquitetura)
- PromptTemplates: templates per specialization with placeholders
- PromptBuilder: build final prompt from template + variables
- LearningEngine: record usage and suggest best template
"""

from app.specialist.specialization_registry import (
    Specialization,
    SpecializationRegistry,
    SPECIALISTS,
)
from app.specialist.prompt_templates import (
    PromptTemplate,
    PromptTemplates,
    STANDARD_SECTIONS,
    SECTION_HEADERS,
)
from app.specialist.prompt_builder import PromptBuilder
from app.specialist.prompt_compiler import (
    PromptCompiler,
    CompilerResult,
    EXPERT_SECTION_HEADERS,
)
from app.specialist.learning_engine import (
    LearningEngine,
    UsageRecord,
)
from app.specialist.execution_standard import EXECUTION_STANDARD
from app.specialist.refinement_standard import REFINEMENT_STANDARD
from app.specialist.base_specialist import BaseSpecialist
from app.specialist.delphi_debug import DelphiDebugSpecialist
from app.specialist.delphi_refactor import DelphiRefactorSpecialist
from app.specialist.delphi_architecture import DelphiArchitectureSpecialist
from app.specialist.plsql_debug import PLSQLDebugSpecialist
from app.specialist.plsql_refactor import PLSQLRefactorSpecialist
from app.specialist.plsql_architecture import PLSQLArchitectureSpecialist
from app.specialist.prompt_refiner import PromptRefiner

__all__ = [
    "Specialization",
    "SpecializationRegistry",
    "SPECIALISTS",
    "PromptTemplate",
    "PromptTemplates",
    "STANDARD_SECTIONS",
    "SECTION_HEADERS",
    "PromptBuilder",
    "PromptCompiler",
    "CompilerResult",
    "EXPERT_SECTION_HEADERS",
    "LearningEngine",
    "UsageRecord",
    "EXECUTION_STANDARD",
    "REFINEMENT_STANDARD",
    "BaseSpecialist",
    "DelphiDebugSpecialist",
    "DelphiRefactorSpecialist",
    "DelphiArchitectureSpecialist",
    "PLSQLDebugSpecialist",
    "PLSQLRefactorSpecialist",
    "PLSQLArchitectureSpecialist",
    "PromptRefiner",
]
