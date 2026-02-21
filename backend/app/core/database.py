from typing import Generator
import logging
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, Session

from app.core.config import settings
# Import all models to ensure they're registered with Base.metadata
from app.models.database import Base, User, Prompt, PromptVersion

logger = logging.getLogger(__name__)

# Configure SQLAlchemy engine with PostgreSQL
# Using pool_pre_ping to verify connections before using them
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # Verify connections before using
    pool_size=5,  # Number of connections to maintain
    max_overflow=10,  # Maximum overflow connections
    echo=False,  # Set to True for SQL query logging
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> bool:
    """
    Initialize database by creating all tables using SQLAlchemy Base metadata.
    This will create all tables defined in models that inherit from Base.
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Test database connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        
        logger.info("Creating database tables from Base.metadata...")
        
        # Create all tables defined in models
        # This uses Base.metadata which contains all table definitions
        Base.metadata.create_all(bind=engine)
        
        # Verify tables were created
        inspector = inspect(engine)
        created_tables = inspector.get_table_names()
        
        logger.info(f"Database initialized successfully. Tables created: {', '.join(created_tables)}")
        return True
        
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        logger.warning("Application will continue without database initialization.")
        logger.warning("Make sure to configure DATABASE_URL correctly and run 'python init_db.py' manually.")
        return False


def drop_all_tables() -> None:
    """
    Drop all tables (use with caution - for development only).
    """
    logger.warning("Dropping all database tables...")
    Base.metadata.drop_all(bind=engine)
    logger.info("All tables dropped.")


def get_db() -> Generator[Session, None, None]:
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
