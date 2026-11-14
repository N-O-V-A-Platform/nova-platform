from contextlib import asynccontextmanager
import uuid

import app.models
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from jose import jwt
from sqlalchemy import select

from app.core.config import settings
from app.api.v1.router import api_router
from app.db.session import AsyncSessionLocal
from app.models.classroom import LiveSession
from app.models.course import Course, Enrollment
from app.models.user import User


def _parse_room_target(room: str) -> tuple[str, str | None]:
    """Return a room kind and room identifier, e.g. ('course', 'uuid')."""
    room = str(room).strip()
    if not room:
        return "", None
    if room.startswith("course:"):
        return "course", room.split(":", 1)[1]
    if room.startswith("session:") or room.startswith("live_session:"):
        return "session", room.split(":", 1)[1]
    if room.startswith("user:"):
        return "user", room.split(":", 1)[1]
    return "", None


async def _can_user_join_room(user_id: str, room: str) -> bool:
    kind, room_id = _parse_room_target(room)
    if not kind or not room_id:
        return False

    try:
        room_uuid = uuid.UUID(str(room_id))
    except ValueError:
        return False

    async with AsyncSessionLocal() as db:
        if kind == "user":
            return str(user_id) == str(room_uuid)

        if kind == "course":
            course = (await db.execute(select(Course).where(Course.id == room_uuid))).scalars().first()
            if not course:
                return False
            if str(course.lecturer_id) == str(user_id):
                return True
            enrolled = (await db.execute(
                select(Enrollment.id).where(Enrollment.course_id == course.id, Enrollment.student_id == user_id)
            )).first()
            return enrolled is not None

        if kind == "session":
            session = (await db.execute(select(LiveSession).where(LiveSession.id == room_uuid))).scalars().first()
            if not session:
                return False
            if str(session.lecturer_id) == str(user_id):
                return True
            course = (await db.execute(select(Course).where(Course.id == session.course_id))).scalars().first()
            if not course:
                return False
            enrolled = (await db.execute(
                select(Enrollment.id).where(Enrollment.course_id == course.id, Enrollment.student_id == user_id)
            )).first()
            return enrolled is not None

    return False


async def _authenticate_websocket_user(websocket: WebSocket) -> str | None:
    token = websocket.query_params.get("token") or websocket.headers.get("authorization", "").replace("Bearer ", "", 1)
    if not token:
        return None

    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        email = payload.get("sub")
        if not email:
            return None
    except Exception:
        return None

    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == email))).scalars().first()
        if not user or not user.is_active or user.status == "Inactive":
            return None
        return str(user.id)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: seed database, then pre-warm the embedding model so the first
    student chat request has zero cold-start latency."""
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
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        scheduler = BackgroundScheduler()

        def weekly_scrape_job():
            import asyncio
            from app.workers.scraper import scrape_worker

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
    except Exception as e:
        print(f"[NOVA] Warning: APScheduler background worker initialization skipped: {e}")
        scheduler = None

    yield

    if scheduler:
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


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    user_id = await _authenticate_websocket_user(websocket)
    if not user_id:
        await websocket.close(code=1008)
        return

    from app.realtime import manager
    await manager.connect(websocket, str(user_id))
    try:
        while True:
            message = await websocket.receive_json()
            event_type = message.get("type") if isinstance(message, dict) else None
            room = message.get("room") if isinstance(message, dict) else None
            if event_type == "join_room" and room:
                if not await _can_user_join_room(user_id, str(room)):
                    await manager.send_personal(websocket, "error", {"message": "Room access denied."})
                    continue
                manager.join_room(websocket, str(room))
            elif event_type == "ping":
                await manager.send_personal(websocket, "pong", {"ok": True})
    except WebSocketDisconnect:
        manager.disconnect(websocket, str(user_id))


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
