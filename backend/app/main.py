import app.models
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.router import api_router

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

@app.on_event("startup")
async def on_startup():
    from app.db.session import AsyncSessionLocal
    from app.db.init_db import init_db
    async with AsyncSessionLocal() as db:
        await init_db(db)
