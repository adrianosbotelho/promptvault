from fastapi import APIRouter

from app.api.v1 import auth, prompts, agent, insights, admin, context, mentor, specialist, profile, templates, integrations, convert, analytics

api_router = APIRouter()

# Include routers
api_router.include_router(auth.router)
api_router.include_router(prompts.router)
api_router.include_router(agent.router)
api_router.include_router(insights.router)
api_router.include_router(admin.router)
api_router.include_router(context.router)
api_router.include_router(mentor.router)
api_router.include_router(specialist.router)
api_router.include_router(profile.router)
api_router.include_router(templates.router)
api_router.include_router(integrations.router)
api_router.include_router(convert.router)
api_router.include_router(analytics.router)


@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}
