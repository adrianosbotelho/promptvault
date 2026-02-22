from typing import List, Optional, Tuple
from datetime import datetime
import asyncio
import logging
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from sqlalchemy.dialects.postgresql import array

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
    
    @staticmethod
    def semantic_search(db: Session, query: str, top_k: int = 5) -> List[Tuple[Prompt, PromptVersion, float]]:
        """
        Perform semantic search using cosine similarity.
        
        Args:
            db: Database session
            query: Search query text
            top_k: Number of top results to return (default: 5)
            
        Returns:
            List of tuples containing (Prompt, PromptVersion, similarity_score)
            ordered by similarity (highest first)
        """
        if not query or not query.strip():
            raise ValueError("Query cannot be empty")
        
        # Generate embedding for the query
        query_embedding = PromptService._generate_embedding_sync(query.strip())
        
        if not query_embedding:
            logger.warning("Could not generate embedding for query. Returning empty results.")
            return []
        
        try:
            # Use raw SQL for pgvector cosine similarity search
            # The <=> operator calculates cosine distance (lower is more similar)
            # We'll get the latest version of each prompt that has an embedding
            sql_query = text("""
                SELECT 
                    p.id as prompt_id,
                    p.name,
                    p.description,
                    p.created_at,
                    p.updated_at,
                    pv.id as version_id,
                    pv.version,
                    pv.content,
                    pv.created_at as version_created_at,
                    1 - (pv.embedding <=> :query_embedding::vector) as similarity
                FROM prompts p
                INNER JOIN prompt_versions pv ON p.id = pv.prompt_id
                INNER JOIN (
                    SELECT prompt_id, MAX(version) as max_version
                    FROM prompt_versions
                    WHERE embedding IS NOT NULL
                    GROUP BY prompt_id
                ) latest ON pv.prompt_id = latest.prompt_id AND pv.version = latest.max_version
                WHERE pv.embedding IS NOT NULL
                ORDER BY pv.embedding <=> :query_embedding::vector
                LIMIT :top_k
            """)
            
            # Convert embedding list to PostgreSQL array format
            embedding_array = array(query_embedding)
            
            result = db.execute(
                sql_query,
                {
                    "query_embedding": str(query_embedding),  # Convert to string for PostgreSQL
                    "top_k": top_k
                }
            )
            
            results = []
            for row in result:
                # Reconstruct Prompt object
                prompt = Prompt(
                    id=row.prompt_id,
                    name=row.name,
                    description=row.description,
                    created_at=row.created_at,
                    updated_at=row.updated_at
                )
                
                # Reconstruct PromptVersion object
                version = PromptVersion(
                    id=row.version_id,
                    prompt_id=row.prompt_id,
                    version=row.version,
                    content=row.content,
                    created_at=row.version_created_at
                )
                
                similarity = float(row.similarity)
                results.append((prompt, version, similarity))
            
            return results
            
        except Exception as e:
            logger.error(f"Error performing semantic search: {e}")
            # If vector search fails, try fallback to text search
            logger.warning("Falling back to text-based search")
            return PromptService._fallback_text_search(db, query, top_k)
    
    @staticmethod
    def _fallback_text_search(db: Session, query: str, top_k: int) -> List[Tuple[Prompt, PromptVersion, float]]:
        """Fallback text search when vector search is not available."""
        # Simple text-based search as fallback
        query_lower = query.lower()
        prompts = db.query(Prompt).all()
        
        results = []
        for prompt in prompts:
            # Get latest version
            latest_version = db.query(func.max(PromptVersion.version)).filter(
                PromptVersion.prompt_id == prompt.id
            ).scalar()
            
            if latest_version:
                version = db.query(PromptVersion).filter(
                    PromptVersion.prompt_id == prompt.id,
                    PromptVersion.version == latest_version
                ).first()
                
                if version and version.content:
                    # Simple text matching score
                    content_lower = version.content.lower()
                    score = 0.0
                    if query_lower in content_lower:
                        score = 0.5
                    if prompt.name and query_lower in prompt.name.lower():
                        score += 0.3
                    if prompt.description and query_lower in prompt.description.lower():
                        score += 0.2
                    
                    if score > 0:
                        results.append((prompt, version, score))
        
        # Sort by score and return top_k
        results.sort(key=lambda x: x[2], reverse=True)
        return results[:top_k]