from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, REAL
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.dialects.postgresql import ARRAY as PG_ARRAY
from datetime import datetime

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
    embedding = Column(
        PG_ARRAY(REAL),
        nullable=True,
        comment="Vector embedding with dimension 1536 using pgvector"
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Many-to-one: PromptVersion -> Prompt
    prompt = relationship("Prompt", back_populates="versions")
