from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db as get_db_session
from app.core.security import decode_access_token
from app.core.llm_provider import LLMProvider
from app.providers.openai_provider import OpenAIProvider
from app.providers.groq_provider import GroqProvider
from app.providers.mock_provider import MockLLMProvider
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
    
    Prioridade de providers para melhoria de prompts:
    1. GroqProvider (se GROQ_API_KEY estiver configurada)
    2. OpenAIProvider (se OPENAI_API_KEY estiver configurada)
    3. MockLLMProvider (fallback para desenvolvimento/testes)
    """
    import logging
    from app.core.config import settings

    logger = logging.getLogger(__name__)

    # 1. Preferir Groq se a chave estiver configurada
    if settings.GROQ_API_KEY and settings.GROQ_API_KEY.strip():
        try:
            logger.info("Using GroqProvider as primary LLM provider")
            return GroqProvider()
        except Exception as e:
            logger.warning(f"Failed to initialize GroqProvider: {e}. Falling back to other providers")

    # 2. Caso contrário, usar OpenAI se disponível
    if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip():
        try:
            logger.info("Using OpenAIProvider as primary LLM provider")
            return OpenAIProvider()
        except Exception as e:
            logger.warning(f"Failed to initialize OpenAIProvider: {e}. Falling back to MockLLMProvider")

    # 3. Fallback final: MockLLMProvider
    logger.info("No valid LLM API keys configured, using MockLLMProvider")
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
