from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db as get_db_session
from app.core.security import decode_access_token
from app.core.llm_provider import LLMProvider
from app.providers.openai_provider import OpenAIProvider
from app.models.database import User

# Security
security = HTTPBearer()


def get_db() -> Generator[Session, None, None]:
    """
    Database dependency for FastAPI routes.
    """
    yield from get_db_session()


def get_llm_provider() -> LLMProvider:
    """
    Get LLM provider instance (dependency injection).
    
    Returns:
        LLMProvider instance (defaults to OpenAIProvider, falls back to MockLLMProvider if API key not configured)
    """
    import logging
    from app.core.config import settings
    from app.providers.mock_provider import MockLLMProvider
    
    logger = logging.getLogger(__name__)
    
    # If OpenAI API key is not configured, use MockLLMProvider
    if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY.strip() == "":
        logger.info("OPENAI_API_KEY not configured, using MockLLMProvider")
        return MockLLMProvider()
    
    try:
        provider = OpenAIProvider()
        logger.info("Using OpenAIProvider")
        return provider
    except (ValueError, Exception) as e:
        # If OpenAIProvider fails to initialize, fall back to MockLLMProvider
        logger.warning(f"Failed to initialize OpenAIProvider: {e}. Falling back to MockLLMProvider")
        return MockLLMProvider()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current authenticated user from JWT token.
    """
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    email: str = payload.get("sub")
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user
