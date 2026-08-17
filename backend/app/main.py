from contextlib import asynccontextmanager

import app.models
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: seed database, then pre-warm the embedding model so the first
    student chat request has zero cold-start latency."""
    from app.db.session import AsyncSessionLocal
    from app.db.init_db import init_db
    async with AsyncSessionLocal() as db:
        await init_db(db)

    # Pre-warm sentence-transformers model in a background thread.
    # This downloads (first run only) and loads the model into RAM.
    # All subsequent requests get sub-50ms embedding latency.
    import asyncio
    def _warm_embedding_model():
        try:
            from app.ai.embeddings import _load_model
            _load_model()  # triggers @lru_cache load
            print("[NOVA] Embedding model pre-warmed and ready.")
        except Exception as e:
            print(f"[NOVA] Warning: embedding model pre-warm failed: {e}")

    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, _warm_embedding_model)

    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
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
