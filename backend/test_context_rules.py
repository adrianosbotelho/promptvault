"""
Test script for ContextRules
"""

from app.ai.context_rules import ContextRules
from app.ai.context_detector import Domain


def test_domain_mapping():
    """Test domain to identifier mapping."""
    print("=" * 50)
    print("Domain to Identifier Mapping")
    print("=" * 50)
    
    test_cases = [
        Domain.DELPHI,
        Domain.ORACLE,
        Domain.ARCHITECTURE,
        Domain.UNKNOWN,
    ]
    
    for domain in test_cases:
        identifier = ContextRules.get_target_identifier(domain)
        print(f"  {domain.value:15} → {identifier}")
    
    print()


def test_reverse_mapping():
    """Test identifier to domain reverse mapping."""
    print("=" * 50)
    print("Identifier to Domain Reverse Mapping")
    print("=" * 50)
    
    test_identifiers = [
        "dev_delphi",
        "dev_oracle",
        "architecture",
        "unknown",
        "invalid_identifier",
    ]
    
    for identifier in test_identifiers:
        domain = ContextRules.get_domain_from_identifier(identifier)
        if domain:
            print(f"  {identifier:20} → {domain.value}")
        else:
            print(f"  {identifier:20} → None (invalid)")
    
    print()


def test_validation():
    """Test identifier validation."""
    print("=" * 50)
    print("Identifier Validation")
    print("=" * 50)
    
    test_identifiers = [
        "dev_delphi",
        "dev_oracle",
        "architecture",
        "unknown",
        "invalid",
        "DELPHI",
        "Dev_Delphi",  # Case insensitive
    ]
    
    for identifier in test_identifiers:
        is_valid = ContextRules.is_valid_identifier(identifier)
        print(f"  {identifier:20} → {'✓ Valid' if is_valid else '✗ Invalid'}")
    
    print()


def test_all_mappings():
    """Test getting all mappings."""
    print("=" * 50)
    print("All Mappings")
    print("=" * 50)
    
    mappings = ContextRules.get_all_mappings()
    for domain, identifier in mappings.items():
        print(f"  {domain.value:15} → {identifier}")
    
    print()


if __name__ == "__main__":
    print()
    print("=" * 50)
    print("Context Rules Tests")
    print("=" * 50)
    print()
    
    test_domain_mapping()
    test_reverse_mapping()
    test_validation()
    test_all_mappings()
    
    print("=" * 50)
    print("Tests completed!")
    print("=" * 50)
