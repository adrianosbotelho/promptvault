from fastapi import APIRouter

from app.api.v1 import auth, prompts, agent, insights, admin, context

api_router = APIRouter()

# Include routers
api_router.include_router(auth.router)
api_router.include_router(prompts.router)
api_router.include_router(agent.router)
api_router.include_router(insights.router)
api_router.include_router(admin.router)
api_router.include_router(context.router)


@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}
