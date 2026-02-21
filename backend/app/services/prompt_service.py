from typing import List, Optional
from datetime import datetime
import asyncio
import logging
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.database import Prompt, PromptVersion
from app.models.prompt import PromptCreate, PromptUpdate, PromptResponse, PromptListItem

logger = logging.getLogger(__name__)


class PromptService:
    """Prompt service following clean architecture."""
    
    @staticmethod
    def _get_embedding_service():
        """Get embedding service instance (prefers Groq, falls back to OpenAI)."""
        from app.core.config import settings
        from app.ai.groq_embedding_service import GroqEmbeddingService
        from app.ai.embedding_service import EmbeddingService
        
        # Try Groq first if API key is available
        if settings.GROQ_API_KEY and settings.GROQ_API_KEY.strip():
            try:
                return GroqEmbeddingService()
            except Exception as e:
                logger.warning(f"Failed to initialize GroqEmbeddingService: {e}. Falling back to OpenAI.")
        
        # Fall back to OpenAI
        if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip():
            try:
                return EmbeddingService()
            except Exception as e:
                logger.warning(f"Failed to initialize EmbeddingService: {e}")
        
        return None
    
    @staticmethod
    def _generate_embedding_sync(content: str) -> Optional[List[float]]:
        """Generate embedding synchronously (wrapper for async embedding service)."""
        try:
            embedding_service = PromptService._get_embedding_service()
            if not embedding_service:
                logger.warning("No embedding service available. Skipping embedding generation.")
                return None
            
            # Try to get existing event loop, or create new one
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # If loop is already running, we need to use a different approach
                    # For now, skip embedding generation in async context
                    logger.warning("Event loop is already running. Skipping embedding generation.")
                    return None
            except RuntimeError:
                # No event loop exists, create a new one
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            try:
                embedding = loop.run_until_complete(embedding_service.get_embedding(content))
                return embedding
            finally:
                # Only close if we created a new loop
                if not loop.is_running():
                    try:
                        loop.close()
                    except Exception:
                        pass
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            # Don't fail the operation if embedding generation fails
            return None
    
    @staticmethod
    def create_prompt(db: Session, prompt_data: PromptCreate) -> Prompt:
        """Create a new prompt with initial version."""
        # Check if prompt name already exists
        existing_prompt = db.query(Prompt).filter(Prompt.name == prompt_data.name).first()
        if existing_prompt:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Prompt with name '{prompt_data.name}' already exists"
            )
        
        # Create prompt
        db_prompt = Prompt(
            name=prompt_data.name,
            description=prompt_data.description,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(db_prompt)
        db.flush()  # Flush to get the prompt ID
        
        # Generate embedding for the initial content
        embedding = PromptService._generate_embedding_sync(prompt_data.content)
        
        # Create initial version (version 1)
        db_version = PromptVersion(
            prompt_id=db_prompt.id,
            version=1,
            content=prompt_data.content,
            embedding=embedding,
            created_at=datetime.utcnow()
        )
        db.add(db_version)
        db.commit()
        db.refresh(db_prompt)
        
        return db_prompt
    
    @staticmethod
    def update_prompt(
        db: Session, 
        prompt_id: int, 
        prompt_data: PromptUpdate
    ) -> Prompt:
        """Update prompt and create new version if content changed."""
        db_prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
        if not db_prompt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Prompt with id {prompt_id} not found"
            )
        
        # Update name if provided
        if prompt_data.name is not None:
            # Check if new name conflicts with existing prompt
            existing = db.query(Prompt).filter(
                Prompt.name == prompt_data.name,
                Prompt.id != prompt_id
            ).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Prompt with name '{prompt_data.name}' already exists"
                )
            db_prompt.name = prompt_data.name
        
        # Update description if provided
        if prompt_data.description is not None:
            db_prompt.description = prompt_data.description
        
        # Create new version if content is provided
        if prompt_data.content is not None:
            # Get the latest version number
            latest_version = db.query(func.max(PromptVersion.version)).filter(
                PromptVersion.prompt_id == prompt_id
            ).scalar() or 0
            
            # Generate embedding for the new content
            embedding = PromptService._generate_embedding_sync(prompt_data.content)
            
            # Create new version
            new_version = PromptVersion(
                prompt_id=prompt_id,
                version=latest_version + 1,
                content=prompt_data.content,
                embedding=embedding,
                created_at=datetime.utcnow()
            )
            db.add(new_version)
        
        # Update timestamp
        db_prompt.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(db_prompt)
        
        return db_prompt
    
    @staticmethod
    def list_prompts(db: Session) -> List[PromptListItem]:
        """List all prompts with their latest version number."""
        prompts = db.query(Prompt).order_by(Prompt.updated_at.desc()).all()
        
        result = []
        for prompt in prompts:
            # Get latest version number
            latest_version = db.query(func.max(PromptVersion.version)).filter(
                PromptVersion.prompt_id == prompt.id
            ).scalar()
            
            result.append(PromptListItem(
                id=prompt.id,
                name=prompt.name,
                description=prompt.description,
                created_at=prompt.created_at,
                updated_at=prompt.updated_at,
                latest_version=latest_version
            ))
        
        return result
    
    @staticmethod
    def get_prompt(db: Session, prompt_id: int) -> Prompt:
        """Get a prompt by ID with all versions."""
        prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
        if not prompt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Prompt with id {prompt_id} not found"
            )
        return prompt
