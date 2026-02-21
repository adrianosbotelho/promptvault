from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    PROJECT_NAME: str = "PromptVault"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]
    
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/promptvault-db"
    INIT_DB_ON_STARTUP: bool = False  # Set to True to auto-create tables on startup
    
    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"  # Default model
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
