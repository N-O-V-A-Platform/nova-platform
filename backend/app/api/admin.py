import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

from app.auth.dependencies import RoleChecker
from app.core.config import settings
from app.db.session import get_db
from app.models.user import Role, User
from app.models.analytics import AuditLog
from app.schemas.user import UserResponse

router = APIRouter(prefix="/admin", tags=["Admin Approval"])


@router.get("/overview")
async def get_admin_overview(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(RoleChecker(["Admin"])),
):
    """Return operational data without ever exposing secret values."""
    total_users = (await db.execute(select(func.count(User.id)))).scalar_one()
    active_users = (
        await db.execute(select(func.count(User.id)).where(User.is_active.is_(True)))
    ).scalar_one()
    student_count = (
        await db.execute(
            select(func.count(User.id)).join(User.role).where(Role.name == "Student")
        )
    ).scalar_one()
    lecturer_count = (
        await db.execute(
            select(func.count(User.id)).join(User.role).where(Role.name == "Lecturer")
        )
    ).scalar_one()
    pending_lecturers = (
        await db.execute(
            select(func.count(User.id))
            .join(User.role)
            .where(User.status == "Pending Approval", Role.name == "Lecturer")
        )
    ).scalar_one()

    from app.models.scrape import ScrapedSource
    from app.workers.scraper import scrape_worker

    scraped_sources = (await db.execute(select(func.count(ScrapedSource.id)))).scalar_one()
    indexed_chunks = (
        await db.execute(select(func.coalesce(func.sum(ScrapedSource.chunk_count), 0)))
    ).scalar_one()
    last_scrape = (
        await db.execute(select(func.max(ScrapedSource.last_scraped_at)))
    ).scalar_one()

    integrations = [
        {"name": "NVIDIA NIM", "configured": bool(settings.NVIDIA_API_KEY)},
        {"name": "Groq", "configured": bool(settings.GROQ_API_KEY)},
        {"name": "OpenRouter", "configured": bool(settings.OPENROUTER_API_KEY)},
        {"name": "Gemini", "configured": bool(settings.GEMINI_API_KEY)},
        {"name": "OpenAI", "configured": bool(settings.OPENAI_API_KEY)},
        {"name": "Pinecone", "configured": bool(settings.PINECONE_API_KEY)},
    ]

    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "students": student_count,
            "lecturers": lecturer_count,
            "pending_lecturers": pending_lecturers,
        },
        "scraper": {
            "is_running": scrape_worker.is_running,
            "sources": scraped_sources,
            "indexed_chunks": indexed_chunks,
            "last_run": last_scrape.isoformat() if last_scrape else None,
        },
        "integrations": integrations,
    }

@router.get("/pending-lecturers", response_model=List[UserResponse])
async def get_pending_lecturers(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(RoleChecker(["Admin"])),
):
    result = await db.execute(
        select(User)
        .join(User.role)
        .where(User.status == "Pending Approval", Role.name == "Lecturer")
        .options(selectinload(User.role))
        .offset(offset)
        .limit(limit)
    )
    users = result.scalars().all()
    
    response = []
    for user in users:
        role_name = user.role.name if user.role else "Lecturer"
        response.append(
            UserResponse(
                id=user.id,
                email=user.email,
                first_name=user.first_name,
                last_name=user.last_name,
                role_name=role_name,
                institution_id=user.institution_id,
                status=user.status
            )
        )
    return response

@router.post("/approve-lecturer/{user_id}")
async def approve_lecturer(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(RoleChecker(["Admin"])),
):
    result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.role))
    )
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lecturer not found."
        )
    if not user.role or user.role.name != "Lecturer":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only lecturer accounts can be approved here.",
        )
    
    user.is_active = True
    user.status = "Active"
    db.add(user)
    db.add(
        AuditLog(
            user_id=admin.id,
            action="approved_lecturer",
            entity_name="user",
            entity_id=user.id,
        )
    )
    await db.commit()
    await db.refresh(user)
    return {"message": f"Lecturer {user.first_name} {user.last_name} approved successfully."}

@router.post("/reject-lecturer/{user_id}")
async def reject_lecturer(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(RoleChecker(["Admin"])),
):
    result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.role))
    )
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lecturer not found."
        )
    if not user.role or user.role.name != "Lecturer":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only lecturer accounts can be rejected here.",
        )
    
    user.status = "Rejected"
    user.is_active = False
    db.add(user)
    db.add(
        AuditLog(
            user_id=admin.id,
            action="rejected_lecturer",
            entity_name="user",
            entity_id=user.id,
        )
    )
    await db.commit()
    return {"message": f"Lecturer {user.first_name} {user.last_name} registration request rejected."}


# Scraper endpoints
@router.post("/scrape/trigger")
async def trigger_scrape(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(RoleChecker(["Admin", "Lecturer"])),
):
    from app.workers.scraper import scrape_worker
    from app.db.session import AsyncSessionLocal

    if scrape_worker.is_running:
        return {"status": "already_running", "message": "Scraper is already running"}

    # Run in background to avoid HTTP timeout
    async def run_in_bg():
        async with AsyncSessionLocal() as session:
            await scrape_worker.run_full_scrape(session)

    background_tasks.add_task(run_in_bg)
    return {"status": "started", "message": "Scraper started in background"}


@router.get("/scrape/status")
async def get_scrape_status(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(RoleChecker(["Admin", "Lecturer"])),
):
    from app.workers.scraper import scrape_worker
    from app.models.scrape import ScrapedSource
    
    # Query summary metrics
    total_result = await db.execute(select(ScrapedSource))
    sources = total_result.scalars().all()
    
    success_count = sum(1 for s in sources if s.status == "success")
    error_count = sum(1 for s in sources if s.status == "error")
    total_chunks = sum(s.chunk_count for s in sources)
    
    last_run = None
    for s in sources:
        if s.last_scraped_at:
            if not last_run or s.last_scraped_at > last_run:
                last_run = s.last_scraped_at
                
    return {
        "is_running": scrape_worker.is_running,
        "total_sources": len(sources),
        "success_count": success_count,
        "error_count": error_count,
        "total_chunks": total_chunks,
        "last_run": last_run.isoformat() if last_run else None
    }


@router.get("/scrape/sources")
async def get_scraped_sources(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(RoleChecker(["Admin", "Lecturer"])),
):
    from app.models.scrape import ScrapedSource
    result = await db.execute(select(ScrapedSource).order_by(ScrapedSource.created_at.desc()))
    return result.scalars().all()
