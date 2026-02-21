"""
Database utility functions for managing tables and schema.
"""
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app.core.database import engine, Base
from app.models.database import User, Prompt, PromptVersion


def get_table_names() -> list[str]:
    """Get list of all table names in the database."""
    inspector = inspect(engine)
    return inspector.get_table_names()


def table_exists(table_name: str) -> bool:
    """Check if a table exists in the database."""
    return table_name in get_table_names()


def get_table_info(table_name: str) -> dict:
    """Get information about a specific table."""
    inspector = inspect(engine)
    if not table_exists(table_name):
        return {}
    
    columns = inspector.get_columns(table_name)
    indexes = inspector.get_indexes(table_name)
    foreign_keys = inspector.get_foreign_keys(table_name)
    
    return {
        "columns": [{"name": col["name"], "type": str(col["type"])} for col in columns],
        "indexes": [idx["name"] for idx in indexes],
        "foreign_keys": [
            {
                "name": fk["name"],
                "constrained_columns": fk["constrained_columns"],
                "referred_table": fk["referred_table"],
            }
            for fk in foreign_keys
        ],
    }


def verify_schema() -> dict:
    """
    Verify that all expected tables exist and return schema information.
    """
    expected_tables = ["users", "prompts", "prompt_versions"]
    existing_tables = get_table_names()
    
    missing_tables = [t for t in expected_tables if t not in existing_tables]
    
    schema_info = {
        "expected_tables": expected_tables,
        "existing_tables": existing_tables,
        "missing_tables": missing_tables,
        "all_tables_exist": len(missing_tables) == 0,
    }
    
    if schema_info["all_tables_exist"]:
        schema_info["tables_info"] = {
            table: get_table_info(table) for table in expected_tables
        }
    
    return schema_info
