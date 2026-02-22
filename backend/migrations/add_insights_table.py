"""
Migration script to add insights table.

This script adds the insights table to store AI agent analysis results.
Run this after creating the Insight model.

Usage:
    cd backend
    python migrations/add_insights_table.py
"""
import sys
import os
import logging

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, inspect

from app.core.database import engine
from app.core.config import settings
from app.models.database import Insight, Base

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


def add_insights_table():
    """Add insights table to the database."""
    try:
        # Test database connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        
        logger.info("Checking if insights table exists...")
        
        # Check if table already exists
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        if "insights" in existing_tables:
            logger.info("Insights table already exists. Skipping migration.")
            return True
        
        logger.info("Creating insights table...")
        
        # Create the table using Base.metadata
        # This will only create tables that don't exist
        Base.metadata.create_all(bind=engine, tables=[Insight.__table__])
        
        # Verify table was created
        inspector = inspect(engine)
        updated_tables = inspector.get_table_names()
        
        if "insights" in updated_tables:
            logger.info("✓ Insights table created successfully!")
            
            # Get table info
            columns = inspector.get_columns("insights")
            logger.info(f"Table 'insights' has {len(columns)} columns:")
            for col in columns:
                logger.info(f"  - {col['name']}: {col['type']}")
            
            return True
        else:
            logger.error("✗ Failed to create insights table")
            return False
        
    except Exception as e:
        logger.error(f"Error creating insights table: {e}", exc_info=True)
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("Migration: Add Insights Table")
    print("=" * 60)
    print(f"Database URL: {settings.DATABASE_URL}")
    print("\nRunning migration...")
    print("-" * 60)
    
    try:
        success = add_insights_table()
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
