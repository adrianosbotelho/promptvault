"""
Script to initialize the database.
Run this script to create all database tables using SQLAlchemy Base.metadata.

Usage:
    cd backend
    python init_db.py
"""
import sys
import logging
from app.core.database import init_db
from app.core.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

if __name__ == "__main__":
    print("=" * 60)
    print("Database Initialization Script")
    print("=" * 60)
    print(f"Database URL: {settings.DATABASE_URL}")
    print("\nInitializing database tables from Base.metadata...")
    print("-" * 60)
    
    try:
        init_db()
        print("\n" + "=" * 60)
        print("✓ Database tables created successfully!")
        print("=" * 60)
    except Exception as e:
        print(f"\n✗ Error initializing database: {e}")
        sys.exit(1)
