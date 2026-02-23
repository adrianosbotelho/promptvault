"""
Migration: Add improved_by column to prompt_versions table.

This column stores the provider name used to improve a prompt version
(e.g., GroqProvider, OpenAIProvider, MockLLMProvider).
"""
from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)


def upgrade(connection):
    """Add improved_by column to prompt_versions table."""
    try:
        # Add improved_by column
        connection.execute(text("""
            ALTER TABLE prompt_versions 
            ADD COLUMN IF NOT EXISTS improved_by VARCHAR
        """))
        
        # Add comment to the column
        connection.execute(text("""
            COMMENT ON COLUMN prompt_versions.improved_by IS 
            'Provider used to improve this version (e.g., GroqProvider, OpenAIProvider, MockLLMProvider)'
        """))
        
        logger.info("Successfully added improved_by column to prompt_versions table")
    except Exception as e:
        logger.error(f"Error adding improved_by column: {e}")
        raise


def downgrade(connection):
    """Remove improved_by column from prompt_versions table."""
    try:
        connection.execute(text("""
            ALTER TABLE prompt_versions 
            DROP COLUMN IF EXISTS improved_by
        """))
        logger.info("Successfully removed improved_by column from prompt_versions table")
    except Exception as e:
        logger.error(f"Error removing improved_by column: {e}")
        raise
