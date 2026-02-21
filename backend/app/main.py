from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db
from app.api.v1.router import api_router


def create_app() -> FastAPI:
    """Create and configure FastAPI application."""
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Initialize database tables on startup (if enabled)
    @app.on_event("startup")
    async def startup_event():
        """Initialize database on application startup."""
        if settings.INIT_DB_ON_STARTUP:
            init_db()
        else:
            import logging
            logger = logging.getLogger(__name__)
            logger.info("Database auto-initialization disabled. Use 'python init_db.py' to create tables manually.")

    # Include API router
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    @app.get("/")
    async def root():
        return {"message": "PromptVault API", "version": settings.VERSION}

    return app


app = create_app()
