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
        
        # Start background agent worker (check database config first, fallback to settings)
        from app.background.agent_worker import start_worker
        from app.core.database import SessionLocal
        from app.services.worker_config_service import WorkerConfigService
        
        db = SessionLocal()
        try:
            worker_config = WorkerConfigService.get_config(db)
            if worker_config.enabled:
                await start_worker()
            else:
                import logging
                logger = logging.getLogger(__name__)
                logger.info("Agent worker is disabled. Enable it in the admin panel at /dashboard/admin/worker")
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Could not check worker config from database: {e}. Checking settings...")
            # Fallback to settings
            if settings.AGENT_WORKER_ENABLED:
                await start_worker()
            else:
                logger.info("Agent worker is disabled. Set AGENT_WORKER_ENABLED=true in .env or enable in admin panel.")
        finally:
            db.close()
    
    @app.on_event("shutdown")
    async def shutdown_event():
        """Cleanup on application shutdown."""
        from app.background.agent_worker import stop_worker
        await stop_worker()

    # Include API router
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    @app.get("/")
    async def root():
        return {"message": "PromptVault API", "version": settings.VERSION}

    return app


app = create_app()
