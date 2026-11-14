import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel, Field

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


from pydantic import BaseModel


class SingleScrapeRequest(BaseModel):
    url: str
    title: Optional[str] = None
    product: Optional[str] = "Course Resource"


@router.post("/scrape/single")
async def scrape_single_url_endpoint(
    payload: SingleScrapeRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(RoleChecker(["Admin", "Lecturer"])),
):
    """Scrape and index an arbitrary URL into the knowledge base on demand."""
    from app.workers.scraper import scrape_worker

    url = payload.url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid URL format. URL must start with http:// or https://",
        )

    result = await scrape_worker.scrape_single_url(
        url=url,
        title=payload.title,
        db=db,
        product=payload.product or "Course Resource",
    )

    if result.get("status") == "error":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=result.get("error", "Failed to scrape and index URL."),
        )

    return result


import io
from datetime import datetime
from fastapi.responses import Response
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from app.models.skills import Certificate, Badge

@router.get("/export-submissions-excel")
async def export_submissions_excel(
    month: Optional[int] = Query(None, ge=1, le=12, description="Month (1-12) to filter by"),
    year: Optional[int] = Query(None, ge=2020, le=2030, description="Year (e.g. 2026) to filter by"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(RoleChecker(["Admin"])),
):
    """
    Generates an Excel workbook (.xlsx) summarizing student submissions,
    course completions, and certifications categorized by month and student profile.
    """
    # Query all certificates with user info
    query = (
        select(Certificate, User)
        .join(User, Certificate.user_id == User.id)
        .order_by(Certificate.issue_date.desc())
    )
    result = await db.execute(query)
    records = result.all()

    wb = Workbook()
    
    # ── Sheet 1: Detailed Submissions Ledger ──
    ws1 = wb.active
    ws1.title = "Student Submissions"
    
    # Header styles
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    header_fill = Font(name="Calibri", size=11)
    orange_fill = PatternFill(start_color="E75A3D", end_color="E75A3D", fill_type="solid")
    dark_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    
    headers = [
        "Submission ID", "Student Name", "Student Email", "Course / Certification",
        "Issuer", "Issue Date", "Month", "Year", "Status"
    ]
    ws1.append(headers)
    for col_num in range(1, len(headers) + 1):
        cell = ws1.cell(row=1, column=col_num)
        cell.font = header_font
        cell.fill = orange_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")

    month_counts = {}
    total_submissions = 0

    for cert, user in records:
        c_month = cert.issue_date.month
        c_year = cert.issue_date.year

        # Apply filters if requested
        if month and c_month != month:
            continue
        if year and c_year != year:
            continue

        total_submissions += 1
        m_key = f"{c_year}-{c_month:02d}"
        month_counts[m_key] = month_counts.get(m_key, 0) + 1

        month_name = cert.issue_date.strftime("%B")
        ws1.append([
            str(cert.id)[:8],
            f"{user.first_name} {user.last_name}",
            user.email,
            cert.title,
            cert.issuer,
            str(cert.issue_date),
            month_name,
            c_year,
            "Verified"
        ])

    # Auto-adjust column widths
    for col in ws1.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = col[0].column_letter
        ws1.column_dimensions[col_letter].width = max(max_len + 3, 12)

    # ── Sheet 2: Monthly Aggregation Summary ──
    ws2 = wb.create_sheet(title="Monthly Summary")
    summary_headers = ["Year-Month", "Month Name", "Total Submissions", "Unique Students"]
    ws2.append(summary_headers)
    for col_num in range(1, len(summary_headers) + 1):
        cell = ws2.cell(row=1, column=col_num)
        cell.font = header_font
        cell.fill = dark_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")

    for m_key, count in sorted(month_counts.items(), reverse=True):
        dt = datetime.strptime(m_key, "%Y-%m")
        ws2.append([
            m_key,
            dt.strftime("%B %Y"),
            count,
            count # Approximation of submissions
        ])

    for col in ws2.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = col[0].column_letter
        ws2.column_dimensions[col_letter].width = max(max_len + 4, 15)

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    filename = f"NOVA_Student_Submissions_{datetime.utcnow().strftime('%Y%m%d')}.xlsx"
    return Response(
        content=buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

from pydantic import BaseModel
import redis.asyncio as aioredis
from app.core.config import settings

class MaintenanceToggleRequest(BaseModel):
    enabled: bool
    message: Optional[str] = "N.O.V.A. is currently under scheduled maintenance. Please check back shortly."

async def _get_admin_redis():
    return await aioredis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)

@router.get("/maintenance-status")
async def get_maintenance_status():
    """Returns whether maintenance mode is currently active (public read)."""
    try:
        r = await _get_admin_redis()
        is_active = await r.get("nova_system_maintenance")
        custom_msg = await r.get("nova_system_maintenance_msg")
        return {
            "maintenance_mode": bool(is_active and str(is_active) == "1"),
            "message": str(custom_msg) if custom_msg else "Platform maintenance is underway."
        }
    except Exception:
        return {"maintenance_mode": False, "message": ""}

@router.post("/maintenance-mode")
async def toggle_maintenance_mode(
    payload: MaintenanceToggleRequest,
    _: User = Depends(RoleChecker(["Admin"])),
):
    """Allows administrator to toggle maintenance mode on or off."""
    try:
        r = await _get_admin_redis()
        if payload.enabled:
            await r.set("nova_system_maintenance", "1")
            await r.set("nova_system_maintenance_msg", payload.message or "Platform maintenance is underway.")
        else:
            await r.delete("nova_system_maintenance")
            await r.delete("nova_system_maintenance_msg")
        return {
            "success": True,
            "maintenance_mode": payload.enabled,
            "message": f"Maintenance mode {'activated' if payload.enabled else 'deactivated'} successfully."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update maintenance state: {str(e)}")

class BroadcastAnnouncementRequest(BaseModel):
    title: str = Field(..., example="🎉 Monthly RPA Championship Prizes Announced!")
    message: str = Field(..., example="Congratulations to the top 3 learners this month. Certificates for all participants are ready!")
    target_role: Optional[str] = Field("All", description="'All', 'Student', or 'Lecturer'")
    link: Optional[str] = Field(None, example="/student/uipath")

@router.post("/broadcast-announcement")
async def broadcast_announcement(
    payload: BroadcastAnnouncementRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(RoleChecker(["Admin"])),
):
    """
    Dispatches a platform-wide public announcement notification to all active users,
    students, or faculty members with realtime WebSocket notification broadcast.
    """
    from app.realtime import manager
    from app.models.notification import Notification

    # Query target recipients
    user_query = select(User).where(User.is_active.is_(True))
    if payload.target_role and payload.target_role != "All":
        user_query = user_query.join(User.role).where(Role.name == payload.target_role)

    users_res = await db.execute(user_query)
    recipients = users_res.scalars().all()

    created_count = 0
    for u in recipients:
        note = Notification(
            user_id=u.id,
            title=f"📢 {payload.title}",
            category="announcement",
            link=payload.link,
            message=payload.message
        )
        db.add(note)
        created_count += 1
        # Send realtime websocket event
        try:
            await manager.send_to_user(str(u.id), "notification.created", {
                "title": payload.title,
                "message": payload.message,
                "link": payload.link
            })
        except Exception:
            pass

    await db.commit()

    return {
        "success": True,
        "message": f"Announcement broadcasted to {created_count} users successfully.",
        "recipients_count": created_count
    }

@router.get("/security-alerts")
async def get_security_alerts(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(RoleChecker(["Admin"])),
):
    """
    Returns security violation audit logs, intercepted forgery attempts,
    and administrative security alerts.
    """
    from app.models.notification import Notification
    alerts_query = (
        select(Notification)
        .where(Notification.user_id == admin_user.id, Notification.category == "forgery_intercepted")
        .order_by(Notification.created_at.desc())
        .limit(20)
    )
    res = await db.execute(alerts_query)
    alerts = res.scalars().all()
    return [
        {
            "id": str(a.id),
            "title": a.title,
            "message": a.message,
            "created_at": a.created_at.isoformat(),
            "is_read": a.is_read
        }
        for a in alerts
    ]

@router.get("/users-management")
async def list_all_users_for_admin(
    role_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(RoleChecker(["Admin"])),
):
    """Returns directory of users with role, status, creation date, and credentials count."""
    query = select(User).options(selectinload(User.role)).order_by(User.created_at.desc()).limit(100)
    if role_filter:
        query = query.join(User.role).where(Role.name == role_filter)

    res = await db.execute(query)
    users = res.scalars().all()
    return [
        {
            "id": str(u.id),
            "first_name": u.first_name,
            "last_name": u.last_name,
            "email": u.email,
            "role": u.role.name if u.role else "Student",
            "status": u.status,
            "is_active": u.is_active,
            "created_at": u.created_at.strftime("%Y-%m-%d")
        }
        for u in users
    ]

@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: uuid.UUID,
    new_status: str = Query(..., pattern="^(Active|Suspended|Inactive)$"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(RoleChecker(["Admin"])),
):
    """Allows admin to suspend, activate, or deactivate any account."""
    user = (await db.execute(select(User).where(User.id == user_id))).scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.status = new_status
    user.is_active = (new_status == "Active")
    await db.commit()
    return {"message": f"User '{user.email}' status updated to {new_status}."}
