"""
Migration script to add read_at column to insights table.

This script adds the read_at column to track when insights are marked as read.
Run this after updating the Insight model.

Usage:
    cd backend
    python migrations/add_read_at_to_insights.py
"""
import sys
import os
import logging

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, inspect

from app.core.database import engine
from app.core.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


def add_read_at_column():
    """Add read_at column to insights table."""
    try:
        # Test database connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        
        logger.info("Checking if read_at column exists...")
        
        # Check if column already exists
        inspector = inspect(engine)
        columns = inspector.get_columns("insights")
        column_names = [col['name'] for col in columns]
        
        if "read_at" in column_names:
            logger.info("read_at column already exists. Skipping migration.")
            return True
        
        logger.info("Adding read_at column to insights table...")
        
        # Add the column
        with engine.connect() as conn:
            conn.execute(text("""
                ALTER TABLE insights 
                ADD COLUMN read_at TIMESTAMP NULL
            """))
            conn.commit()
            
            # Create index for better query performance
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_insights_read_at 
                ON insights(read_at)
            """))
            conn.commit()
        
        logger.info("✓ read_at column added successfully!")
        
        # Verify column was added
        inspector = inspect(engine)
        updated_columns = inspector.get_columns("insights")
        updated_column_names = [col['name'] for col in updated_columns]
        
        if "read_at" in updated_column_names:
            logger.info("✓ Column verification successful!")
            return True
        else:
            logger.error("✗ Column verification failed")
            return False
        
    except Exception as e:
        logger.error(f"Error adding read_at column: {e}", exc_info=True)
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("Migration: Add read_at Column to Insights Table")
    print("=" * 60)
    print(f"Database URL: {settings.DATABASE_URL}")
    print("\nRunning migration...")
    print("-" * 60)
    
    try:
        success = add_read_at_column()
        if success:
            print("\n" + "=" * 60)
            print("✓ Migration completed successfully!")
            print("=" * 60)
        else:
            print("\n" + "=" * 60)
            print("✗ Migration failed!")
            print("=" * 60)
            sys.exit(1)
    except Exception as e:
        print(f"\n✗ Error running migration: {e}")
        sys.exit(1)
