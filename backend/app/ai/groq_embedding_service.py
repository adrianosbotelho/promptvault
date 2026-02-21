"""
Embedding Service using Groq API.

Groq provides OpenAI-compatible API endpoints, so we can use the OpenAI SDK
with Groq's base URL to access embeddings through Groq's infrastructure.
This allows using Groq's fast inference while maintaining compatibility.
"""
import logging
from typing import List, Optional
from openai import AsyncOpenAI
from openai import APIError

from app.core.config import settings

logger = logging.getLogger(__name__)

# Default embedding model (using OpenAI-compatible endpoint via Groq)
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSION = 1536

# Groq's OpenAI-compatible API base URL
GROQ_BASE_URL = "https://api.groq.com/openai/v1"


class GroqEmbeddingService:
    """
    Service for generating text embeddings using Groq's OpenAI-compatible API.
    
    Groq provides OpenAI-compatible endpoints, allowing us to use OpenAI's
    embeddings API through Groq's infrastructure for faster inference.
    
    Uses the text-embedding-3-small model which produces 1536-dimensional vectors.
    """
    
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        """
        Initialize the Groq Embedding Service.
        
        Args:
            api_key: Groq API key (defaults to settings.GROQ_API_KEY)
            model: Embedding model to use (defaults to text-embedding-3-small)
        """
        self.api_key = api_key or settings.GROQ_API_KEY
        self.model = model or EMBEDDING_MODEL
        
        if not self.api_key:
            raise ValueError(
                "Groq API key is required. Set GROQ_API_KEY in settings or .env file."
            )
        
        # Use OpenAI SDK with Groq's base URL for OpenAI-compatible API
        self.client = AsyncOpenAI(
            api_key=self.api_key,
            base_url=GROQ_BASE_URL
        )
    
    async def get_embedding(self, text: str) -> List[float]:
        """
        Generate embedding vector for the given text using Groq's API.
        
        Args:
            text: The text to generate embedding for
            
        Returns:
            List of floats representing the embedding vector (1536 dimensions)
            
        Raises:
            ValueError: If text is empty or API key is not configured
            APIError: If Groq API call fails
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
                raise ValueError("Groq API returned empty embedding data")
            
            embedding = response.data[0].embedding
            
            if len(embedding) != EMBEDDING_DIMENSION:
                logger.warning(
                    f"Expected embedding dimension {EMBEDDING_DIMENSION}, "
                    f"got {len(embedding)}"
                )
            
            return embedding
            
        except APIError as e:
            logger.error(f"Groq API error while generating embedding: {e}")
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
            APIError: If Groq API call fails
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
            logger.error(f"Groq API error while generating batch embeddings: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error while generating batch embeddings: {e}")
            raise
