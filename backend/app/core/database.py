from typing import Generator
import logging
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, Session

from app.core.config import settings
# Import all models to ensure they're registered with Base.metadata
from app.models.database import Base, User, Prompt, PromptVersion, Insight, WorkerConfig, ArchitectProfile, Specialization

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
        
        logger.info("Enabling pgvector extension...")
        # Enable pgvector extension if not already enabled
        with engine.connect() as conn:
            try:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                conn.commit()
                logger.info("pgvector extension enabled successfully")
            except Exception as e:
                logger.warning(f"Could not enable pgvector extension: {e}")
                logger.warning("Continuing without pgvector. Make sure pgvector is installed in PostgreSQL.")
        
        logger.info("Creating database tables from Base.metadata...")
        
        # Create all tables defined in models
        # This uses Base.metadata which contains all table definitions
        Base.metadata.create_all(bind=engine)
        
        # Convert embedding column to vector type if pgvector is available
        logger.info("Configuring embedding column with pgvector...")
        with engine.connect() as conn:
            try:
                # Check if column exists and is not already vector type
                result = conn.execute(text("""
                    SELECT data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'prompt_versions' 
                    AND column_name = 'embedding'
                """))
                column_info = result.fetchone()
                
                if column_info and column_info[0] != 'USER-DEFINED':
                    # Convert ARRAY to vector type
                    conn.execute(text("""
                        ALTER TABLE prompt_versions 
                        ALTER COLUMN embedding TYPE vector(1536) 
                        USING embedding::vector(1536)
                    """))
                    conn.commit()
                    logger.info("Embedding column converted to vector(1536)")
                elif not column_info:
                    # Add vector column if it doesn't exist
                    conn.execute(text("""
                        ALTER TABLE prompt_versions 
                        ADD COLUMN embedding vector(1536)
                    """))
                    conn.commit()
                    logger.info("Embedding column added as vector(1536)")
            except Exception as e:
                logger.warning(f"Could not configure vector column: {e}")
                logger.warning("Embedding column will use ARRAY type. Install pgvector for full support.")
        
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
