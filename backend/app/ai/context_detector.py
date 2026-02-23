"""
Context Detector Module

Analyzes input text and detects the domain context:
- Delphi code
- Oracle SQL
- Architecture discussion

Returns structured information about the detected context.
"""

import re
from typing import Dict, Optional
from enum import Enum
from dataclasses import dataclass
from app.core.categories import PromptCategory


class Domain(Enum):
    """Supported domains for context detection."""
    DELPHI = "delphi"
    ORACLE = "oracle"
    ARCHITECTURE = "arquitetura"
    UNKNOWN = "unknown"


class Subdomain(Enum):
    """Subdomains within each domain."""
    # Delphi subdomains
    DELPHI_IMPLEMENTATION = "implementation"
    DELPHI_DEBUG = "debug"
    DELPHI_ARCHITECTURE = "architecture"
    DELPHI_PERFORMANCE = "performance"
    
    # Oracle subdomains
    ORACLE_IMPLEMENTATION = "implementation"
    ORACLE_DEBUG = "debug"
    ORACLE_ARCHITECTURE = "architecture"
    ORACLE_PERFORMANCE = "performance"
    
    # Architecture subdomains
    ARCH_ANALYSIS = "analysis"
    ARCH_IMPROVEMENT = "improvement"
    
    # Unknown
    UNKNOWN = "unknown"


@dataclass
class ContextDetectionResult:
    """Result of context detection."""
    domain: Domain
    subdomain: Subdomain
    confidence: float  # 0.0 to 1.0
    
    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            "domain": self.domain.value,
            "subdomain": self.subdomain.value,
            "confidence": round(self.confidence, 2)
        }


class ContextDetector:
    """
    Detects context from input text.
    
    Uses pattern matching and keyword analysis to identify:
    - Delphi code patterns
    - Oracle SQL patterns
    - Architecture discussions
    """
    
    # Delphi patterns
    DELPHI_KEYWORDS = [
        'delphi', 'pascal', 'object pascal', 'lazarus', 'freepascal',
        'procedure', 'function', 'unit', 'uses', 'interface', 'implementation',
        'var', 'const', 'type', 'class', 'record', 'array', 'string',
        'tform', 'tbutton', 'tlabel', 'tdataset', 'tquery', 'tadoconnection',
        'vcl', 'fmx', 'firemonkey', 'indy', 'zeos', 'dbexpress'
    ]
    
    DELPHI_CODE_PATTERNS = [
        r'\bprocedure\s+\w+',
        r'\bfunction\s+\w+',
        r'\bunit\s+\w+',
        r'\buses\s+',
        r'\binterface\s*;',
        r'\bimplementation\s*;',
        r'\btype\s+\w+\s*=',
        r'\bclass\s*\([^)]+\)',
        r'\bT[A-Z]\w+\s*=\s*class',
        r'\bT[A-Z]\w+\s*=\s*record',
    ]
    
    # Oracle SQL patterns
    ORACLE_KEYWORDS = [
        'oracle', 'pl/sql', 'plsql', 'sqlplus', 'sql developer',
        'select', 'from', 'where', 'join', 'inner join', 'left join',
        'right join', 'union', 'group by', 'order by', 'having',
        'insert', 'update', 'delete', 'merge', 'create table',
        'alter table', 'drop table', 'truncate', 'commit', 'rollback',
        'sequence', 'trigger', 'procedure', 'function', 'package',
        'cursor', 'exception', 'declare', 'begin', 'end',
        'varchar2', 'number', 'date', 'timestamp', 'clob', 'blob',
        'index', 'constraint', 'primary key', 'foreign key', 'unique',
        'explain plan', 'autotrace', 'tkprof', 'awr', 'ash', 'statspack'
    ]
    
    ORACLE_SQL_PATTERNS = [
        r'\bSELECT\s+.+\s+FROM\b',
        r'\bSELECT\s+\*\s+FROM\b',
        r'\bINSERT\s+INTO\b',
        r'\bUPDATE\s+\w+\s+SET\b',
        r'\bDELETE\s+FROM\b',
        r'\bCREATE\s+TABLE\b',
        r'\bALTER\s+TABLE\b',
        r'\bCREATE\s+(OR\s+REPLACE\s+)?(PROCEDURE|FUNCTION|PACKAGE)\b',
        r'\bDECLARE\s+',
        r'\bBEGIN\s+',
        r'\bEXCEPTION\s+',
        r'\bEND\s*;',
        r'\bVARCHAR2\s*\(',
        r'\bNUMBER\s*\(',
        r'\bEXPLAIN\s+PLAN\b',
        r'\bWHERE\s+\w+\s*=',  # Simple WHERE clauses
        r'\bFROM\s+\w+\b',  # FROM clause
    ]
    
    # Architecture keywords
    ARCHITECTURE_KEYWORDS = [
        'architecture', 'arquitetura', 'design pattern', 'padrão de projeto',
        'microservices', 'monolith', 'monolito', 'distributed system',
        'scalability', 'escalabilidade', 'performance', 'desempenho',
        'security', 'segurança', 'reliability', 'confiabilidade',
        'maintainability', 'manutenibilidade', 'testability', 'testabilidade',
        'layered architecture', 'arquitetura em camadas', 'mvc', 'mvp', 'mvvm',
        'rest api', 'graphql', 'soap', 'event-driven', 'evento',
        'message queue', 'fila de mensagens', 'cache', 'database',
        'load balancing', 'balanceamento de carga', 'cdn', 'cloud',
        'aws', 'azure', 'gcp', 'kubernetes', 'docker', 'container',
        'ci/cd', 'continuous integration', 'integração contínua',
        'monitoring', 'monitoramento', 'logging', 'log',
        'observability', 'observabilidade', 'tracing', 'rastreamento'
    ]
    
    ARCHITECTURE_PATTERNS = [
        r'\b(design\s+)?pattern\b',
        r'\bmicroservice[s]?\b',
        r'\b(rest|graphql|soap)\s+api\b',
        r'\b(layered|tiered)\s+architecture\b',
        r'\b(event[-_]?driven|evento)\b',
        r'\b(load\s+)?balanc(ing|er)\b',
        r'\bci[/_]?cd\b',
        r'\bcontinuous\s+integration\b',
    ]
    
    def detect(self, text: str) -> ContextDetectionResult:
        """
        Detect context from input text.
        
        Args:
            text: Input text to analyze
            
        Returns:
            ContextDetectionResult with domain, subdomain, and confidence
        """
        if not text or not text.strip():
            return ContextDetectionResult(
                domain=Domain.UNKNOWN,
                subdomain=Subdomain.UNKNOWN,
                confidence=0.0
            )
        
        text_lower = text.lower()
        text_upper = text.upper()
        
        # Calculate scores for each domain
        delphi_score = self._calculate_delphi_score(text_lower, text)
        oracle_score = self._calculate_oracle_score(text_lower, text_upper)
        architecture_score = self._calculate_architecture_score(text_lower, text)
        
        # Determine domain with highest score
        scores = {
            Domain.DELPHI: delphi_score,
            Domain.ORACLE: oracle_score,
            Domain.ARCHITECTURE: architecture_score,
        }
        
        max_domain = max(scores.items(), key=lambda x: x[1])
        
        # If confidence is too low, return unknown
        if max_domain[1] < 0.3:
            return ContextDetectionResult(
                domain=Domain.UNKNOWN,
                subdomain=Subdomain.UNKNOWN,
                confidence=max_domain[1]
            )
        
        domain = max_domain[0]
        confidence = max_domain[1]
        
        # Determine subdomain based on domain and content
        subdomain = self._detect_subdomain(domain, text_lower, text)
        
        return ContextDetectionResult(
            domain=domain,
            subdomain=subdomain,
            confidence=min(confidence, 1.0)
        )
    
    def _calculate_delphi_score(self, text_lower: str, text: str) -> float:
        """Calculate Delphi detection score."""
        score = 0.0
        
        # Keyword matching
        keyword_matches = sum(1 for keyword in self.DELPHI_KEYWORDS if keyword in text_lower)
        keyword_score = min(keyword_matches / len(self.DELPHI_KEYWORDS) * 2, 0.5)
        score += keyword_score
        
        # Pattern matching
        pattern_matches = sum(1 for pattern in self.DELPHI_CODE_PATTERNS if re.search(pattern, text, re.IGNORECASE))
        pattern_score = min(pattern_matches / len(self.DELPHI_CODE_PATTERNS) * 2, 0.4)
        score += pattern_score
        
        # Strong indicators (higher weight)
        if any(keyword in text_lower for keyword in ['unit ', 'uses ', 'interface', 'implementation']):
            score += 0.1
        
        return min(score, 1.0)
    
    def _calculate_oracle_score(self, text_lower: str, text_upper: str) -> float:
        """Calculate Oracle SQL detection score."""
        score = 0.0
        
        # Keyword matching
        keyword_matches = sum(1 for keyword in self.ORACLE_KEYWORDS if keyword in text_lower)
        keyword_score = min(keyword_matches / len(self.ORACLE_KEYWORDS) * 2, 0.5)
        score += keyword_score
        
        # SQL pattern matching (case-sensitive for SQL keywords)
        pattern_matches = sum(1 for pattern in self.ORACLE_SQL_PATTERNS if re.search(pattern, text_upper))
        pattern_score = min(pattern_matches / len(self.ORACLE_SQL_PATTERNS) * 2, 0.4)
        score += pattern_score
        
        # Strong indicators
        if any(keyword in text_lower for keyword in ['pl/sql', 'plsql', 'varchar2', 'explain plan']):
            score += 0.1
        
        return min(score, 1.0)
    
    def _calculate_architecture_score(self, text_lower: str, text: str) -> float:
        """Calculate Architecture detection score."""
        score = 0.0
        
        # Keyword matching
        keyword_matches = sum(1 for keyword in self.ARCHITECTURE_KEYWORDS if keyword in text_lower)
        keyword_score = min(keyword_matches / len(self.ARCHITECTURE_KEYWORDS) * 2, 0.5)
        score += keyword_score
        
        # Pattern matching
        pattern_matches = sum(1 for pattern in self.ARCHITECTURE_PATTERNS if re.search(pattern, text_lower))
        pattern_score = min(pattern_matches / len(self.ARCHITECTURE_PATTERNS) * 2, 0.4)
        score += pattern_score
        
        # Strong indicators
        if any(keyword in text_lower for keyword in ['design pattern', 'padrão de projeto', 'microservice', 'arquitetura']):
            score += 0.1
        
        return min(score, 1.0)
    
    def _detect_subdomain(self, domain: Domain, text_lower: str, text: str) -> Subdomain:
        """Detect subdomain based on domain and content."""
        if domain == Domain.DELPHI:
            if any(word in text_lower for word in ['debug', 'erro', 'error', 'exception', 'try', 'except']):
                return Subdomain.DELPHI_DEBUG
            elif any(word in text_lower for word in ['performance', 'desempenho', 'otimização', 'optimization', 'slow', 'lento']):
                return Subdomain.DELPHI_PERFORMANCE
            elif any(word in text_lower for word in ['architecture', 'arquitetura', 'design', 'pattern', 'padrão']):
                return Subdomain.DELPHI_ARCHITECTURE
            else:
                return Subdomain.DELPHI_IMPLEMENTATION
        
        elif domain == Domain.ORACLE:
            if any(word in text_lower for word in ['debug', 'erro', 'error', 'exception', 'troubleshoot', 'diagnose']):
                return Subdomain.ORACLE_DEBUG
            elif any(word in text_lower for word in ['performance', 'desempenho', 'tuning', 'otimização', 'slow', 'lento', 'explain plan', 'autotrace']):
                return Subdomain.ORACLE_PERFORMANCE
            elif any(word in text_lower for word in ['architecture', 'arquitetura', 'design', 'schema', 'model']):
                return Subdomain.ORACLE_ARCHITECTURE
            else:
                return Subdomain.ORACLE_IMPLEMENTATION
        
        elif domain == Domain.ARCHITECTURE:
            if any(word in text_lower for word in ['improvement', 'melhoria', 'refactor', 'refatoração', 'optimize', 'otimizar']):
                return Subdomain.ARCH_IMPROVEMENT
            else:
                return Subdomain.ARCH_ANALYSIS
        
        else:
            return Subdomain.UNKNOWN
    
    def detect_category(self, text: str) -> Optional[PromptCategory]:
        """
        Detect PromptCategory from text.
        
        Args:
            text: Input text to analyze
            
        Returns:
            PromptCategory if detected, None otherwise
        """
        result = self.detect(text)
        
        if result.domain == Domain.UNKNOWN:
            return None
        
        # Map Domain to PromptCategory
        category_map = {
            Domain.DELPHI: PromptCategory.DELPHI,
            Domain.ORACLE: PromptCategory.ORACLE,
            Domain.ARCHITECTURE: PromptCategory.ARQUITETETURA,
        }
        
        return category_map.get(result.domain)
