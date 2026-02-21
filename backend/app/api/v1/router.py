from fastapi import APIRouter

from app.api.v1 import auth, prompts

api_router = APIRouter()

# Include routers
api_router.include_router(auth.router)
api_router.include_router(prompts.router)


@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}
