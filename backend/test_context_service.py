"""
Test script for ContextService
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_db
from app.ai.context_service import ContextService


def test_delphi_context():
    """Test ContextService with Delphi code."""
    service = ContextService()
    
    text = """
    unit MainForm;
    
    interface
    
    uses
      System.SysUtils, System.Classes, Vcl.Forms, Vcl.Controls;
    
    type
      TMainForm = class(TForm)
        Button1: TButton;
        procedure Button1Click(Sender: TObject);
      end;
    
    implementation
    
    procedure TMainForm.Button1Click(Sender: TObject);
    begin
      ShowMessage('Hello World');
    end;
    """
    
    db = next(get_db())
    try:
        result = service.analyze(db, text, top_k=3)
        print("=" * 60)
        print("Delphi Context Test")
        print("=" * 60)
        print(f"Domain: {result.context.domain.value}")
        print(f"Subdomain: {result.context.subdomain.value}")
        print(f"Confidence: {result.context.confidence:.2f}")
        print(f"Target Identifier: {result.target_identifier}")
        print(f"Suggested Prompts: {len(result.suggested_prompts)}")
        for i, prompt in enumerate(result.suggested_prompts, 1):
            print(f"  {i}. {prompt.prompt.name} (similarity: {prompt.similarity:.3f})")
        print()
    finally:
        db.close()


def test_oracle_context():
    """Test ContextService with Oracle SQL."""
    service = ContextService()
    
    text = """
    SELECT employee_id, first_name, last_name, salary
    FROM employees
    WHERE department_id = 10
    ORDER BY salary DESC;
    
    EXPLAIN PLAN FOR
    SELECT * FROM employees WHERE employee_id = 100;
    """
    
    db = next(get_db())
    try:
        result = service.analyze(db, text, top_k=3)
        print("=" * 60)
        print("Oracle Context Test")
        print("=" * 60)
        print(f"Domain: {result.context.domain.value}")
        print(f"Subdomain: {result.context.subdomain.value}")
        print(f"Confidence: {result.context.confidence:.2f}")
        print(f"Target Identifier: {result.target_identifier}")
        print(f"Suggested Prompts: {len(result.suggested_prompts)}")
        for i, prompt in enumerate(result.suggested_prompts, 1):
            print(f"  {i}. {prompt.prompt.name} (similarity: {prompt.similarity:.3f})")
        print()
    finally:
        db.close()


def test_architecture_context():
    """Test ContextService with architecture discussion."""
    service = ContextService()
    
    text = """
    We need to design a microservices architecture for our e-commerce platform.
    The system should use REST APIs for communication between services.
    We'll implement an event-driven architecture with message queues.
    """
    
    db = next(get_db())
    try:
        result = service.analyze(db, text, top_k=3)
        print("=" * 60)
        print("Architecture Context Test")
        print("=" * 60)
        print(f"Domain: {result.context.domain.value}")
        print(f"Subdomain: {result.context.subdomain.value}")
        print(f"Confidence: {result.context.confidence:.2f}")
        print(f"Target Identifier: {result.target_identifier}")
        print(f"Suggested Prompts: {len(result.suggested_prompts)}")
        for i, prompt in enumerate(result.suggested_prompts, 1):
            print(f"  {i}. {prompt.prompt.name} (similarity: {prompt.similarity:.3f})")
        print()
    finally:
        db.close()


def test_to_dict():
    """Test to_dict method."""
    service = ContextService()
    
    text = "SELECT * FROM users WHERE id = 1"
    
    db = next(get_db())
    try:
        result = service.analyze(db, text, top_k=2)
        print("=" * 60)
        print("To Dict Test")
        print("=" * 60)
        import json
        result_dict = result.to_dict()
        print(json.dumps(result_dict, indent=2, default=str))
        print()
    finally:
        db.close()


if __name__ == "__main__":
    print()
    print("=" * 60)
    print("Context Service Tests")
    print("=" * 60)
    print()
    
    try:
        test_delphi_context()
        test_oracle_context()
        test_architecture_context()
        test_to_dict()
        
        print("=" * 60)
        print("Tests completed!")
        print("=" * 60)
    except Exception as e:
        print(f"Error running tests: {e}")
        import traceback
        traceback.print_exc()
