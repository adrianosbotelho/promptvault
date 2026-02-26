from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, REAL, JSON, Enum as SQLEnum
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.dialects.postgresql import ARRAY as PG_ARRAY
from datetime import datetime

from app.core.categories import PromptCategory, PromptTag

Base = declarative_base()


class User(Base):
    """User database model for single-user system."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Prompt(Base):
    """Prompt model (aggregate root for prompt versions)."""

    __tablename__ = "prompts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(
        SQLEnum(PromptCategory),
        nullable=True,
        index=True,
        comment="Category of the prompt (delphi, oracle, arquitetura)"
    )
    tags = Column(
        PG_ARRAY(String),
        nullable=True,
        comment="Array of tags for the prompt"
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # One-to-many: Prompt -> PromptVersion
    versions = relationship(
        "PromptVersion",
        back_populates="prompt",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class PromptVersion(Base):
    """Versioned prompt content."""

    __tablename__ = "prompt_versions"

    id = Column(Integer, primary_key=True, index=True)
    prompt_id = Column(
        Integer,
        ForeignKey("prompts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    # Note: embedding column is defined as vector(1536) in database via pgvector
    # We don't define it in SQLAlchemy model to avoid type conflicts
    # Embeddings are always set/updated using raw SQL
    # embedding = Column(...)  # Intentionally not defined - use raw SQL only
    improved_by = Column(
        String,
        nullable=True,
        comment="Provider used to improve this version (e.g., GroqProvider, OpenAIProvider, MockLLMProvider)"
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Many-to-one: PromptVersion -> Prompt
    prompt = relationship("Prompt", back_populates="versions")


class Insight(Base):
    """Insight model for storing AI agent analysis results."""
    
    __tablename__ = "insights"
    
    id = Column(Integer, primary_key=True, index=True)
    prompt_id = Column(
        Integer,
        ForeignKey("prompts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Store structured suggestions as JSON
    improvement_ideas = Column(JSON, nullable=True, comment="List of improvement ideas")
    reusable_patterns = Column(JSON, nullable=True, comment="List of reusable patterns")
    warnings = Column(JSON, nullable=True, comment="List of warnings")
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    read_at = Column(DateTime, nullable=True, index=True, comment="Timestamp when insight was marked as read")
    
    # Many-to-one: Insight -> Prompt
    prompt = relationship("Prompt", backref="insights")


class WorkerConfig(Base):
    """Worker configuration model for storing agent worker settings."""
    
    __tablename__ = "worker_config"
    
    id = Column(Integer, primary_key=True, index=True, default=1)  # Single row
    enabled = Column(String, nullable=False, default="false", comment="Enable/disable automatic worker (true/false)")
    interval_minutes = Column(Integer, nullable=False, default=5, comment="Interval between analysis cycles in minutes")
    max_prompts = Column(Integer, nullable=False, default=5, comment="Maximum prompts to analyze per cycle")
    max_retries = Column(Integer, nullable=False, default=2, comment="Maximum retries per prompt")
    use_free_apis_only = Column(String, nullable=False, default="true", comment="Use only free APIs (true/false)")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class ArchitectProfile(Base):
    """Architect profile storing preferences and tendencies for mentor/agent context."""

    __tablename__ = "architect_profiles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=True, comment="Optional profile name (e.g. 'default')")

    preferred_patterns = Column(JSON, nullable=True, comment="List of preferred architectural/design patterns")
    recurring_decisions = Column(JSON, nullable=True, comment="Recurring architectural or technical decisions")
    common_domains = Column(JSON, nullable=True, comment="Domains or problem areas the architect frequently works in")
    risk_tendencies = Column(JSON, nullable=True, comment="Risk tendencies and technology adoption preferences")
    optimization_focus = Column(JSON, nullable=True, comment="What the architect tends to optimize for")

    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
