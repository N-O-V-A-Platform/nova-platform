from fastapi import FastAPI
from app.core.config import settings

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
)

@app.get("/")
async def root():
    return {
        "message": "Welcome to N.O.V.A API"
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "nova-backend",
        "version": "1.0.0"
    }