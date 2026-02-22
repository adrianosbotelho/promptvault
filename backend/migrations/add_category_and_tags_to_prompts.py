"""
Migration script to add category and tags columns to prompts table.

This script adds the category (enum) and tags (array) columns to the prompts table.
Run this after updating the Prompt model.

Usage:
    cd backend
    python migrations/add_category_and_tags_to_prompts.py
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


def add_category_and_tags_columns():
    """Add category and tags columns to prompts table."""
    try:
        # Test database connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        
        logger.info("Checking if category and tags columns exist...")
        
        # Check if columns already exist
        inspector = inspect(engine)
        columns = inspector.get_columns("prompts")
        column_names = [col['name'] for col in columns]
        
        category_exists = "category" in column_names
        tags_exists = "tags" in column_names
        
        if category_exists and tags_exists:
            logger.info("category and tags columns already exist. Skipping migration.")
            return True
        
        logger.info("Adding category and tags columns to prompts table...")
        
        with engine.connect() as conn:
            # Add category column if it doesn't exist
            if not category_exists:
                logger.info("Adding category column...")
                # Create enum type first
                conn.execute(text("""
                    DO $$ BEGIN
                        CREATE TYPE promptcategory AS ENUM ('delphi', 'oracle', 'arquitetura');
                    EXCEPTION
                        WHEN duplicate_object THEN null;
                    END $$;
                """))
                conn.commit()
                
                # Add column
                conn.execute(text("""
                    ALTER TABLE prompts 
                    ADD COLUMN category promptcategory NULL
                """))
                conn.commit()
                
                # Create index
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS ix_prompts_category 
                    ON prompts(category)
                """))
                conn.commit()
                logger.info("✓ category column added successfully!")
            
            # Add tags column if it doesn't exist
            if not tags_exists:
                logger.info("Adding tags column...")
                conn.execute(text("""
                    ALTER TABLE prompts 
                    ADD COLUMN tags TEXT[] NULL
                """))
                conn.commit()
                logger.info("✓ tags column added successfully!")
        
        # Verify columns were added
        inspector = inspect(engine)
        updated_columns = inspector.get_columns("prompts")
        updated_column_names = [col['name'] for col in updated_columns]
        
        if "category" in updated_column_names and "tags" in updated_column_names:
            logger.info("✓ Column verification successful!")
            return True
        else:
            logger.error("✗ Column verification failed")
            return False
        
    except Exception as e:
        logger.error(f"Error adding category and tags columns: {e}", exc_info=True)
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("Migration: Add Category and Tags Columns to Prompts Table")
    print("=" * 60)
    print(f"Database URL: {settings.DATABASE_URL}")
    print("\nRunning migration...")
    print("-" * 60)
    
    try:
        success = add_category_and_tags_columns()
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
