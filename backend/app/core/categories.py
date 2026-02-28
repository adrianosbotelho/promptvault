"""
Enums for Prompt categories and tags.

These enums avoid magic strings and provide type safety.
"""
from enum import Enum


class PromptCategory(str, Enum):
    """Categories for prompts."""
    DELPHI = "delphi"
    ORACLE = "oracle"
    ARQUITETURA = "arquitetura"
    PYTHON = "python"
    SQL = "sql"
    API = "api"
    
    def __str__(self) -> str:
        return self.value


class PromptTag(str, Enum):
    """Tags for prompts."""
    # Common tags
    IMPLEMENTATION = "implementation"
    DEBUG = "debug"
    ARCHITECTURE = "architecture"
    PERFORMANCE = "performance"
    
    # Arquitetura-specific tags
    ANALYSIS = "analysis"
    IMPROVEMENT = "improvement"
    
    def __str__(self) -> str:
        return self.value
