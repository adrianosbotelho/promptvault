"""
Migration: add is_favorite to prompts, create architect_profiles, prompt_templates, specializations.

Usage:
    cd backend
    python migrations/add_favorites_templates_and_profiles.py
"""
import sys
import os
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, inspect

from app.core.database import engine
from app.core.config import settings
from app.models.database import ArchitectProfile, PromptTemplate, Specialization, Base

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def run():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    logger.info("Database connection OK")

    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    # 1. Add is_favorite column to prompts
    prompts_columns = [c["name"] for c in inspector.get_columns("prompts")]
    if "is_favorite" not in prompts_columns:
        logger.info("Adding is_favorite column to prompts...")
        with engine.begin() as conn:
            conn.execute(text(
                "ALTER TABLE prompts ADD COLUMN is_favorite BOOLEAN NOT NULL DEFAULT false"
            ))
        logger.info("✓ is_favorite added to prompts")
    else:
        logger.info("is_favorite already exists in prompts — skipping")

    # 2. Create architect_profiles table
    if "architect_profiles" not in existing_tables:
        logger.info("Creating architect_profiles table...")
        Base.metadata.create_all(bind=engine, tables=[ArchitectProfile.__table__])
        logger.info("✓ architect_profiles created")
    else:
        logger.info("architect_profiles already exists — skipping")

    # 3. Create specializations table
    if "specializations" not in existing_tables:
        logger.info("Creating specializations table...")
        Base.metadata.create_all(bind=engine, tables=[Specialization.__table__])
        logger.info("✓ specializations created")
    else:
        logger.info("specializations already exists — skipping")

    # 4. Create prompt_templates table
    if "prompt_templates" not in existing_tables:
        logger.info("Creating prompt_templates table...")
        Base.metadata.create_all(bind=engine, tables=[PromptTemplate.__table__])
        logger.info("✓ prompt_templates created")
    else:
        logger.info("prompt_templates already exists — skipping")

    # 5. Add new categories to the prompts.category enum if needed
    logger.info("Checking prompts.category enum for new values (python, sql, api)...")
    try:
        with engine.begin() as conn:
            for val in ("python", "sql", "api"):
                conn.execute(text(f"ALTER TYPE promptcategory ADD VALUE IF NOT EXISTS '{val}'"))
        logger.info("✓ Enum values ensured")
    except Exception as e:
        logger.warning(f"Could not alter enum (may already be up to date): {e}")

    return True


if __name__ == "__main__":
    print("=" * 60)
    print("Migration: Favorites, Templates & Profiles")
    print("=" * 60)
    print(f"Database: {settings.DATABASE_URL}")
    print("-" * 60)
    try:
        run()
        print("\n✓ Migration completed successfully!")
    except Exception as e:
        print(f"\n✗ Migration failed: {e}")
        logger.error("Migration failed", exc_info=True)
        sys.exit(1)
