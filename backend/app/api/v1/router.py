from fastapi import APIRouter

from app.api.v1.endpoints import health
from app.api import auth, users, courses, resources, chats, admin

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(courses.router)
api_router.include_router(resources.router)
api_router.include_router(chats.router)
api_router.include_router(admin.router)