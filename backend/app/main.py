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
            from app.core.config import settings
            _load_model(settings.EMBEDDING_MODEL)  # triggers @lru_cache load
            print("[NOVA] Embedding model pre-warmed and ready.")
        except Exception as e:
            print(f"[NOVA] Warning: embedding model pre-warm failed: {e}")

    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, _warm_embedding_model)

    # Pre-initialize Redis connection for MemoryService to avoid races on first request
    from app.api.chats import memory_service
    try:
        await memory_service.initialize()
        print("[NOVA] Redis memory service pre-initialized.")
    except Exception as e:
        print(f"[NOVA] Warning: Redis memory service pre-initialization failed: {e}")

    # Initialize APScheduler for weekly scrape tasks
    from apscheduler.schedulers.background import BackgroundScheduler
    scheduler = BackgroundScheduler()

    def weekly_scrape_job():
        import asyncio
        from app.workers.scraper import scrape_worker
        from app.db.session import AsyncSessionLocal
        
        async def _run():
            async with AsyncSessionLocal() as session:
                await scrape_worker.run_full_scrape(session)
                
        new_loop = asyncio.new_event_loop()
        try:
            new_loop.run_until_complete(_run())
        finally:
            new_loop.close()

    # Schedule for Sunday at 2:00 AM
    scheduler.add_job(weekly_scrape_job, "cron", day_of_week="sun", hour=2, minute=0)
    scheduler.start()
    print("[NOVA] Weekly UiPath documentation scraper schedule started.")

    yield
    
    # Shutdown scheduler on app shutdown
    scheduler.shutdown()
    print("[NOVA] Scheduler stopped.")


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

from fastapi.staticfiles import StaticFiles
import os
os.makedirs("static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

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
