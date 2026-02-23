"""
AI Services Module

Provides AI-related services including embeddings and context detection.
"""

from app.ai.embedding_service import EmbeddingService
from app.ai.groq_embedding_service import GroqEmbeddingService
from app.ai.context_detector import ContextDetector, ContextDetectionResult, Domain, Subdomain
from app.ai.context_rules import ContextRules
from app.ai.context_service import ContextService, ContextServiceResult

__all__ = [
    'EmbeddingService',
    'GroqEmbeddingService',
    'ContextDetector',
    'ContextDetectionResult',
    'Domain',
    'Subdomain',
    'ContextRules',
    'ContextService',
    'ContextServiceResult',
]
