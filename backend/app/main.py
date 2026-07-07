import app.models
from fastapi import FastAPI

from app.core.config import settings
from app.api.v1.router import api_router

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
)

app.include_router(
    api_router,
    prefix=settings.API_V1_STR,
)

@app.get("/")
async def root():
    return {"message": "Welcome to N.O.V.A API"}

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "nova-backend",
        "version": settings.APP_VERSION,
    }