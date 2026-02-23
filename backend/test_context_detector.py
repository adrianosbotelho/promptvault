"""
Test script for ContextDetector
"""

from app.ai.context_detector import ContextDetector

def test_delphi():
    """Test Delphi detection."""
    detector = ContextDetector()
    
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
    
    result = detector.detect(text)
    print(f"Delphi Test:")
    print(f"  Domain: {result.domain.value}")
    print(f"  Subdomain: {result.subdomain.value}")
    print(f"  Confidence: {result.confidence}")
    print(f"  Dict: {result.to_dict()}")
    print()


def test_oracle():
    """Test Oracle SQL detection."""
    detector = ContextDetector()
    
    text = """
    CREATE OR REPLACE PROCEDURE get_employee_data (
        p_employee_id IN NUMBER,
        p_result OUT SYS_REFCURSOR
    ) AS
    BEGIN
        OPEN p_result FOR
            SELECT employee_id, first_name, last_name, salary
            FROM employees
            WHERE employee_id = p_employee_id;
    END;
    /
    
    EXPLAIN PLAN FOR
    SELECT * FROM employees WHERE department_id = 10;
    """
    
    result = detector.detect(text)
    print(f"Oracle Test:")
    print(f"  Domain: {result.domain.value}")
    print(f"  Subdomain: {result.subdomain.value}")
    print(f"  Confidence: {result.confidence}")
    print(f"  Dict: {result.to_dict()}")
    print()


def test_architecture():
    """Test Architecture detection."""
    detector = ContextDetector()
    
    text = """
    We need to design a microservices architecture for our e-commerce platform.
    The system should use REST APIs for communication between services.
    We'll implement an event-driven architecture with message queues.
    Each service should be independently deployable using Docker containers.
    """
    
    result = detector.detect(text)
    print(f"Architecture Test:")
    print(f"  Domain: {result.domain.value}")
    print(f"  Subdomain: {result.subdomain.value}")
    print(f"  Confidence: {result.confidence}")
    print(f"  Dict: {result.to_dict()}")
    print()


def test_unknown():
    """Test unknown text."""
    detector = ContextDetector()
    
    text = "This is just a regular text without any specific technical context."
    
    result = detector.detect(text)
    print(f"Unknown Test:")
    print(f"  Domain: {result.domain.value}")
    print(f"  Subdomain: {result.subdomain.value}")
    print(f"  Confidence: {result.confidence}")
    print(f"  Dict: {result.to_dict()}")
    print()


if __name__ == "__main__":
    print("=" * 50)
    print("Context Detector Tests")
    print("=" * 50)
    print()
    
    test_delphi()
    test_oracle()
    test_architecture()
    test_unknown()
    
    print("=" * 50)
    print("Tests completed!")
    print("=" * 50)
