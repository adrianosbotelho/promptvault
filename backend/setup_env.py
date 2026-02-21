"""
Helper script to create .env file with database configuration.
Run this script to generate a .env file template.

Usage:
    python setup_env.py
"""
import os
from pathlib import Path

def create_env_file():
    """Create .env file with database configuration."""
    env_path = Path(__file__).parent / ".env"
    
    if env_path.exists():
        print(f"⚠️  File {env_path} already exists!")
        response = input("Do you want to overwrite it? (y/N): ")
        if response.lower() != 'y':
            print("Cancelled.")
            return
    
    print("\n" + "=" * 60)
    print("Database Configuration Setup")
    print("=" * 60)
    print("\nPlease provide your PostgreSQL connection details:")
    print("(Press Enter to use defaults shown in brackets)\n")
    
    # Get database configuration
    db_user = input("Database user [postgres]: ").strip() or "postgres"
    db_password = input("Database password [postgres]: ").strip() or "postgres"
    db_host = input("Database host [localhost]: ").strip() or "localhost"
    db_port = input("Database port [5432]: ").strip() or "5432"
    db_name = input("Database name [promptvault-db]: ").strip() or "promptvault-db"
    
    # Build DATABASE_URL
    database_url = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    
    # Get other settings
    print("\nOther settings:")
    secret_key = input("Secret key for JWT (leave empty to generate): ").strip()
    if not secret_key:
        import secrets
        secret_key = secrets.token_urlsafe(32)
        print(f"Generated secret key: {secret_key[:20]}...")
    
    init_on_startup = input("Initialize database on startup? (y/N): ").strip().lower() == 'y'
    
    # Write .env file
    env_content = f"""# Database Configuration
DATABASE_URL={database_url}
INIT_DB_ON_STARTUP={str(init_on_startup).lower()}

# JWT Configuration
SECRET_KEY={secret_key}
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS Origins (comma-separated, no spaces)
BACKEND_CORS_ORIGINS=["http://localhost:3000","http://localhost:3001"]
"""
    
    with open(env_path, 'w') as f:
        f.write(env_content)
    
    print("\n" + "=" * 60)
    print(f"✅ Created {env_path}")
    print("=" * 60)
    print(f"\nDATABASE_URL: {database_url}")
    print(f"INIT_DB_ON_STARTUP: {init_on_startup}")
    print("\nNext steps:")
    print("1. Verify the DATABASE_URL is correct")
    print("2. Make sure PostgreSQL is running and the database exists")
    print("3. Run: python init_db.py")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    create_env_file()
