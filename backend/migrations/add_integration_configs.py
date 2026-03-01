"""
Migration: create integration_configs table.

Usage:
    cd backend
    python migrations/add_integration_configs.py
"""
import sys
import os
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, inspect

from app.core.database import engine
from app.core.config import settings
from app.models.database import IntegrationConfig, Base

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def run():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    logger.info("Database connection OK")

    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    if "integration_configs" not in existing_tables:
        logger.info("Creating integration_configs table...")
        Base.metadata.create_all(bind=engine, tables=[IntegrationConfig.__table__])
        logger.info("✓ integration_configs created")
    else:
        logger.info("integration_configs already exists — skipping")

    return True


if __name__ == "__main__":
    print("=" * 60)
    print("Migration: Add Integration Configs Table")
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
