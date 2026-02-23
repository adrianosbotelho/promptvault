"""
Context Rules Module

Defines mapping rules between detected domains and their target representations.
This module provides a centralized way to map context detection results to
various system identifiers, categories, or labels.
"""

from typing import Dict, Optional
from app.ai.context_detector import Domain


class ContextRules:
    """
    Mapping rules for context domains.
    
    Provides mappings between detected domains and their target representations
    for use across the system.
    """
    
    # Domain to target identifier mapping
    DOMAIN_MAPPING: Dict[Domain, str] = {
        Domain.DELPHI: "dev_delphi",
        Domain.ORACLE: "dev_oracle",
        Domain.ARCHITECTURE: "architecture",
        Domain.UNKNOWN: "unknown",
    }
    
    # Reverse mapping (target identifier to Domain)
    REVERSE_MAPPING: Dict[str, Domain] = {
        "dev_delphi": Domain.DELPHI,
        "dev_oracle": Domain.ORACLE,
        "architecture": Domain.ARCHITECTURE,
        "unknown": Domain.UNKNOWN,
    }
    
    @classmethod
    def get_target_identifier(cls, domain: Domain) -> str:
        """
        Get target identifier for a given domain.
        
        Args:
            domain: The detected domain
            
        Returns:
            Target identifier string (e.g., "dev_delphi", "dev_oracle", "architecture")
        """
        return cls.DOMAIN_MAPPING.get(domain, "unknown")
    
    @classmethod
    def get_domain_from_identifier(cls, identifier: str) -> Optional[Domain]:
        """
        Get Domain enum from target identifier.
        
        Args:
            identifier: Target identifier string (e.g., "dev_delphi", "dev_oracle", "architecture")
            
        Returns:
            Domain enum if found, None otherwise
        """
        return cls.REVERSE_MAPPING.get(identifier.lower())
    
    @classmethod
    def get_all_mappings(cls) -> Dict[Domain, str]:
        """
        Get all domain mappings.
        
        Returns:
            Dictionary mapping Domain to target identifier
        """
        return cls.DOMAIN_MAPPING.copy()
    
    @classmethod
    def is_valid_identifier(cls, identifier: str) -> bool:
        """
        Check if an identifier is valid.
        
        Args:
            identifier: Target identifier string to validate
            
        Returns:
            True if identifier is valid, False otherwise
        """
        return identifier.lower() in cls.REVERSE_MAPPING
