"""
Script to create the initial user for PromptVault.
This is a single-user system, so you only need to create one user.

Usage:
    cd backend
    python create_user.py
"""
import sys
import logging
from app.core.database import SessionLocal, init_db
from app.services.auth_service import AuthService
from app.models.user import UserCreate

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def create_initial_user():
    """Create the initial user for the system."""
    print("=" * 60)
    print("PromptVault - Create Initial User")
    print("=" * 60)
    print("\nThis script will create the first user for your PromptVault instance.")
    print("Since this is a single-user system, you only need one user.\n")
    
    # Check if database is initialized
    print("Checking database connection...")
    if not init_db():
        print("\n✗ Error: Could not connect to database.")
        print("Please make sure:")
        print("  1. PostgreSQL is running")
        print("  2. DATABASE_URL in .env is correct")
        print("  3. Database exists")
        sys.exit(1)
    
    print("✓ Database connection successful\n")
    
    # Get user input
    print("Please provide user credentials:")
    print("-" * 60)
    
    email = input("Email: ").strip()
    if not email:
        print("✗ Error: Email is required")
        sys.exit(1)
    
    password = input("Password: ").strip()
    if not password:
        print("✗ Error: Password is required")
        sys.exit(1)
    
    confirm_password = input("Confirm Password: ").strip()
    if password != confirm_password:
        print("✗ Error: Passwords do not match")
        sys.exit(1)
    
    # Create user
    db = SessionLocal()
    try:
        print("\nCreating user...")
        user_data = UserCreate(email=email, password=password)
        user = AuthService.create_user(db, user_data)
        print("\n" + "=" * 60)
        print("✓ User created successfully!")
        print("=" * 60)
        print(f"\nEmail: {user.email}")
        print(f"ID: {user.id}")
        print("\nYou can now login to PromptVault using these credentials.")
        print("\n" + "=" * 60)
    except Exception as e:
        print(f"\n✗ Error creating user: {e}")
        if "already exists" in str(e):
            print("\nA user with this email already exists.")
            print("You can use these credentials to login.")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    create_initial_user()
