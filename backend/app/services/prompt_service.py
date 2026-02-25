from typing import List, Optional, Tuple
from datetime import datetime
import asyncio
import logging
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from sqlalchemy.dialects.postgresql import array

from app.models.database import Prompt, PromptVersion
from app.models.prompt import (
    PromptCreate, 
    PromptUpdate, 
    PromptResponse, 
    PromptListItem,
    GroupedPromptsResponse,
    GroupedPromptsByCategory,
    GroupedPromptsByTag
)
from app.core.categories import PromptCategory, PromptTag
from app.models.database import Insight

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
        
        # Convert tags from enum to string list for storage
        tags_list = None
        if prompt_data.tags:
            tags_list = [tag.value if hasattr(tag, 'value') else str(tag) for tag in prompt_data.tags]
        
        # Create prompt
        db_prompt = Prompt(
            name=prompt_data.name,
            description=prompt_data.description,
            category=prompt_data.category,
            tags=tags_list,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(db_prompt)
        db.flush()  # Flush to get the prompt ID
        
        # Generate embedding for the initial content
        embedding = PromptService._generate_embedding_sync(prompt_data.content)
        
        # Create initial version (version 1) using raw SQL to avoid SQLAlchemy vector type issues
        # This completely bypasses the ORM for the version insertion
        created_at = datetime.utcnow()
        if embedding:
            # Convert embedding list to string format for PostgreSQL vector type
            embedding_str = '[' + ','.join(map(str, embedding)) + ']'
            # Insert version with embedding using raw SQL
            result = db.execute(
                text("""
                    INSERT INTO prompt_versions (prompt_id, version, content, embedding, created_at)
                    VALUES (:prompt_id, 1, :content, :embedding::vector(1536), :created_at)
                    RETURNING id
                """),
                {
                    "prompt_id": db_prompt.id,
                    "content": prompt_data.content,
                    "embedding": embedding_str,
                    "created_at": created_at
                }
            )
        else:
            # Insert version without embedding using raw SQL
            result = db.execute(
                text("""
                    INSERT INTO prompt_versions (prompt_id, version, content, created_at)
                    VALUES (:prompt_id, 1, :content, :created_at)
                    RETURNING id
                """),
                {
                    "prompt_id": db_prompt.id,
                    "content": prompt_data.content,
                    "created_at": created_at
                }
            )
        version_id = result.scalar()
        logger.debug(f"Created prompt version {version_id} for prompt {db_prompt.id}")
        
        db.commit()
        db.refresh(db_prompt)
        
        return db_prompt
    
    @staticmethod
    def update_prompt(
        db: Session, 
        prompt_id: int, 
        prompt_data: PromptUpdate,
        improved_by: Optional[str] = None
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
        
        # Update category if provided
        if prompt_data.category is not None:
            db_prompt.category = prompt_data.category
        
        # Update tags if provided
        if prompt_data.tags is not None:
            # Convert tags from enum to string list for storage
            tags_list = [tag.value if hasattr(tag, 'value') else str(tag) for tag in prompt_data.tags]
            db_prompt.tags = tags_list
        
        # Create new version if content is provided
        if prompt_data.content is not None:
            # Get the latest version number
            latest_version = db.query(func.max(PromptVersion.version)).filter(
                PromptVersion.prompt_id == prompt_id
            ).scalar() or 0
            
            # Generate embedding for the new content
            embedding = PromptService._generate_embedding_sync(prompt_data.content)
            
            # Create new version using raw SQL to avoid SQLAlchemy vector type issues
            new_version_num = latest_version + 1
            created_at = datetime.utcnow()
            
            if embedding:
                # Convert embedding list to string format for PostgreSQL vector type
                embedding_str = '[' + ','.join(map(str, embedding)) + ']'
                # Insert version with embedding using raw SQL
                result = db.execute(
                    text("""
                        INSERT INTO prompt_versions (prompt_id, version, content, embedding, improved_by, created_at)
                        VALUES (:prompt_id, :version, :content, :embedding::vector(1536), :improved_by, :created_at)
                        RETURNING id
                    """),
                    {
                        "prompt_id": prompt_id,
                        "version": new_version_num,
                        "content": prompt_data.content,
                        "embedding": embedding_str,
                        "improved_by": improved_by,
                        "created_at": created_at
                    }
                )
            else:
                # Insert version without embedding using raw SQL
                result = db.execute(
                    text("""
                        INSERT INTO prompt_versions (prompt_id, version, content, improved_by, created_at)
                        VALUES (:prompt_id, :version, :content, :improved_by, :created_at)
                        RETURNING id
                    """),
                    {
                        "prompt_id": prompt_id,
                        "version": new_version_num,
                        "content": prompt_data.content,
                        "improved_by": improved_by,
                        "created_at": created_at
                    }
                )
            version_id = result.scalar()
            logger.debug(f"Created prompt version {version_id} (v{new_version_num}) for prompt {prompt_id}")
        
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
            result.append(PromptService._prompt_to_list_item(db, prompt))
        
        return result
    
    @staticmethod
    def _prompt_to_list_item(db: Session, prompt: Prompt) -> PromptListItem:
        """Convert a Prompt model to PromptListItem."""
        # Get latest version number
        latest_version = db.query(func.max(PromptVersion.version)).filter(
            PromptVersion.prompt_id == prompt.id
        ).scalar()
        
        # Get improved_by from the latest version
        improved_by = None
        if latest_version:
            latest_version_obj = db.query(PromptVersion).filter(
                PromptVersion.prompt_id == prompt.id,
                PromptVersion.version == latest_version
            ).order_by(PromptVersion.created_at.desc()).first()
            if latest_version_obj:
                improved_by = latest_version_obj.improved_by
        
        return PromptListItem(
            id=prompt.id,
            name=prompt.name,
            description=prompt.description,
            category=prompt.category,
            tags=prompt.tags,  # Already stored as strings in DB
            created_at=prompt.created_at,
            updated_at=prompt.updated_at,
            latest_version=latest_version,
            provider=improved_by  # Add provider field
        )
    
    @staticmethod
    def get_grouped_prompts(db: Session) -> GroupedPromptsResponse:
        """
        Get prompts grouped by category and tag.
        
        Returns:
            GroupedPromptsResponse with prompts organized by category and tag
        """
        prompts = db.query(Prompt).order_by(Prompt.updated_at.desc()).all()
        
        # Convert all prompts to list items
        prompt_items = [PromptService._prompt_to_list_item(db, p) for p in prompts]
        
        # Group by category
        by_category_dict = {}
        for prompt_item in prompt_items:
            category_key = prompt_item.category.value if prompt_item.category else None
            if category_key not in by_category_dict:
                by_category_dict[category_key] = []
            by_category_dict[category_key].append(prompt_item)
        
        # Convert to GroupedPromptsByCategory list
        # Sort with None values at the end
        by_category = []
        sorted_items = sorted(
            by_category_dict.items(),
            key=lambda x: (x[0] is None, x[0] or '')
        )
        for category_key, category_prompts in sorted_items:
            by_category.append(GroupedPromptsByCategory(
                category=category_key,
                prompts=category_prompts,
                count=len(category_prompts)
            ))
        
        # Group by tag
        by_tag_dict = {}
        for prompt_item in prompt_items:
            if prompt_item.tags:
                for tag in prompt_item.tags:
                    if tag not in by_tag_dict:
                        by_tag_dict[tag] = []
                    # Only add if not already in list (avoid duplicates)
                    if prompt_item not in by_tag_dict[tag]:
                        by_tag_dict[tag].append(prompt_item)
        
        # Convert to GroupedPromptsByTag list
        by_tag = []
        for tag_key, tag_prompts in sorted(by_tag_dict.items()):
            by_tag.append(GroupedPromptsByTag(
                tag=tag_key,
                prompts=tag_prompts,
                count=len(tag_prompts)
            ))
        
        # Calculate totals
        total_prompts = len(prompt_items)
        total_with_category = sum(1 for p in prompt_items if p.category is not None)
        total_with_tags = sum(1 for p in prompt_items if p.tags and len(p.tags) > 0)
        
        return GroupedPromptsResponse(
            by_category=by_category,
            by_tag=by_tag,
            total_prompts=total_prompts,
            total_with_category=total_with_category,
            total_with_tags=total_with_tags
        )
    
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
    def delete_prompt(db: Session, prompt_id: int) -> None:
        """Delete a prompt and all its versions."""
        prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
        if not prompt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Prompt with id {prompt_id} not found"
            )
        
        # Delete prompt (cascade will delete versions automatically)
        db.delete(prompt)
        db.commit()
    
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
    
    @staticmethod
    def get_statistics(db: Session) -> dict:
        """
        Get statistics about prompts.
        
        Returns:
            dict with statistics including:
            - total_prompts: Total number of prompts
            - total_by_category: Count of prompts by category
            - total_analyzed: Number of prompts with insights
            - total_improved: Number of prompts with more than 1 version
            - total_versions: Total number of versions
            - uncategorized_count: Number of prompts without category
        """
        # Total prompts
        total_prompts = db.query(func.count(Prompt.id)).scalar() or 0
        
        # Total versions
        total_versions = db.query(func.count(PromptVersion.id)).scalar() or 0
        
        # Prompts by category
        category_counts = db.query(
            Prompt.category,
            func.count(Prompt.id)
        ).group_by(Prompt.category).all()
        
        total_by_category = {}
        uncategorized_count = 0
        
        for category, count in category_counts:
            if category is None:
                uncategorized_count = int(count)
            else:
                # Convert enum to lowercase string for consistency
                if hasattr(category, 'value'):
                    category_key = category.value.lower()
                elif hasattr(category, 'name'):
                    category_key = category.name.lower()
                else:
                    category_key = str(category).lower()
                total_by_category[category_key] = int(count)
        
        # Prompts with insights (analyzed)
        prompts_with_insights = int(db.query(func.count(func.distinct(Insight.prompt_id))).scalar() or 0)
        
        # Prompts with more than 1 version (improved)
        # Count distinct prompt_ids that have more than 1 version
        improved_prompts_subquery = db.query(
            PromptVersion.prompt_id
        ).group_by(PromptVersion.prompt_id).having(
            func.count(PromptVersion.id) > 1
        ).subquery()
        
        total_improved = int(db.query(func.count(improved_prompts_subquery.c.prompt_id)).scalar() or 0)
        
        # Ensure all values are proper types
        return {
            "total_prompts": total_prompts,
            "total_by_category": total_by_category,
            "total_analyzed": prompts_with_insights,
            "total_improved": total_improved,
            "total_versions": total_versions,
            "uncategorized_count": uncategorized_count
        }