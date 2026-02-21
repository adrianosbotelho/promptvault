"""
Embedding Service using OpenAI Embeddings API.

This service generates vector embeddings for text using OpenAI's embedding models.
"""
import logging
from typing import List, Optional
from openai import AsyncOpenAI, APIError

from app.core.config import settings

logger = logging.getLogger(__name__)

# Default embedding model
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSION = 1536


class EmbeddingService:
    """
    Service for generating text embeddings using OpenAI's Embeddings API.
    
    Uses the text-embedding-3-small model which produces 1536-dimensional vectors.
    """
    
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        """
        Initialize the Embedding Service.
        
        Args:
            api_key: OpenAI API key (defaults to settings.OPENAI_API_KEY)
            model: OpenAI embedding model to use (defaults to text-embedding-3-small)
        """
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model = model or EMBEDDING_MODEL
        
        if not self.api_key:
            raise ValueError(
                "OpenAI API key is required. Set OPENAI_API_KEY in settings or .env file."
            )
        
        self.client = AsyncOpenAI(api_key=self.api_key)
    
    async def get_embedding(self, text: str) -> List[float]:
        """
        Generate embedding vector for the given text.
        
        Args:
            text: The text to generate embedding for
            
        Returns:
            List of floats representing the embedding vector (1536 dimensions)
            
        Raises:
            ValueError: If text is empty or API key is not configured
            APIError: If OpenAI API call fails
        """
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")
        
        try:
            response = await self.client.embeddings.create(
                model=self.model,
                input=text.strip(),
                dimensions=EMBEDDING_DIMENSION
            )
            
            if not response.data or len(response.data) == 0:
                raise ValueError("OpenAI API returned empty embedding data")
            
            embedding = response.data[0].embedding
            
            if len(embedding) != EMBEDDING_DIMENSION:
                logger.warning(
                    f"Expected embedding dimension {EMBEDDING_DIMENSION}, "
                    f"got {len(embedding)}"
                )
            
            return embedding
            
        except APIError as e:
            logger.error(f"OpenAI API error while generating embedding: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error while generating embedding: {e}")
            raise
    
    async def get_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts in a single API call.
        
        Args:
            texts: List of texts to generate embeddings for
            
        Returns:
            List of embedding vectors, one for each input text
            
        Raises:
            ValueError: If texts list is empty or contains empty strings
            APIError: If OpenAI API call fails
        """
        if not texts:
            raise ValueError("Texts list cannot be empty")
        
        # Filter out empty texts
        valid_texts = [text.strip() for text in texts if text and text.strip()]
        
        if not valid_texts:
            raise ValueError("No valid texts provided")
        
        try:
            response = await self.client.embeddings.create(
                model=self.model,
                input=valid_texts,
                dimensions=EMBEDDING_DIMENSION
            )
            
            if not response.data or len(response.data) != len(valid_texts):
                raise ValueError(
                    f"Expected {len(valid_texts)} embeddings, "
                    f"got {len(response.data) if response.data else 0}"
                )
            
            embeddings = [item.embedding for item in response.data]
            
            # Validate dimensions
            for i, embedding in enumerate(embeddings):
                if len(embedding) != EMBEDDING_DIMENSION:
                    logger.warning(
                        f"Text {i}: Expected dimension {EMBEDDING_DIMENSION}, "
                        f"got {len(embedding)}"
                    )
            
            return embeddings
            
        except APIError as e:
            logger.error(f"OpenAI API error while generating batch embeddings: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error while generating batch embeddings: {e}")
            raise
