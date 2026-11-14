import uuid
from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.models.user import User
from app.models.skills import Certificate, Badge
from app.auth.dependencies import get_current_user
from app.api.uipath_courses_data import UIPATH_RPA_COURSES
from app.ai.certificate_inspector import CertificateInspectorAgent

router = APIRouter(prefix="/uipath", tags=["UiPath Academy Integration"])

# Comprehensive 10-course UiPath Robotic Process Automation (RPA) Curricula
UIPATH_COURSES = UIPATH_RPA_COURSES

class CertificateUploadRequest(BaseModel):
    course_id: str
    issue_date: str = Field(..., description="Date of completion (YYYY-MM-DD)")
    verification_url: str = Field(..., description="Official UiPath Academy certificate verification URL")
    verification_id: Optional[str] = Field(None, description="Unique Certificate ID (optional)")

@router.get("/courses")
async def list_uipath_courses(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch user's completed certificates
    cert_result = await db.execute(
        select(Certificate).where(
            Certificate.user_id == current_user.id,
            Certificate.issuer == "UiPath Academy"
        )
    )
    completed_titles = {c.title for c in cert_result.scalars().all()}
    
    courses_with_status = []
    for c in UIPATH_COURSES:
        courses_with_status.append({
            **c,
            "completed": c["title"] in completed_titles
        })
    return courses_with_status

@router.get("/journey")
async def get_uipath_journey(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch user's completed certificates
    cert_result = await db.execute(
        select(Certificate).where(
            Certificate.user_id == current_user.id,
            Certificate.issuer == "UiPath Academy"
        )
    )
    completed_titles = {c.title for c in cert_result.scalars().all()}

    recommended_course = None
    completed_count = 0
    
    # Study Journey algorithm: Linear daily suggestion
    for c in UIPATH_COURSES:
        if c["title"] in completed_titles:
            completed_count += 1
        elif recommended_course is None:
            recommended_course = c

    return {
        "completed_count": completed_count,
        "total_count": len(UIPATH_COURSES),
        "recommended_course": recommended_course,
        "journey_percentage": int((completed_count / len(UIPATH_COURSES)) * 100),
        "message": (
            "Congratulations! You have mastered the entire UiPath study journey!"
            if completed_count == len(UIPATH_COURSES)
            else f"Keep up the great work! Your recommended course for today is: {recommended_course['title']}."
        )
    }

@router.post("/upload-certificate")
async def upload_certificate(
    data: CertificateUploadRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Match course id
    course = next((c for c in UIPATH_COURSES if c["id"] == data.course_id), None)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Check if already has certificate
    existing = await db.execute(
        select(Certificate).where(
            Certificate.user_id == current_user.id,
            Certificate.title == course["title"],
            Certificate.issuer == "UiPath Academy"
        )
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="You have already uploaded a certificate for this course.")

    # Deep Inspection with CertificateInspectorAgent
    is_valid, flaw_reason, _ = await CertificateInspectorAgent.inspect_credential(
        title=course["title"],
        issuer="UiPath Academy",
        verification_url=data.verification_url
    )
    if not is_valid:
        await CertificateInspectorAgent.flag_forgery_and_notify_admin(
            db=db,
            student=current_user,
            certificate_title=course["title"],
            verification_url=data.verification_url,
            detection_reason=flaw_reason
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Certificate Rejected: {flaw_reason}. An official integrity alert has been recorded on your profile and dispatched to the platform administrator."
        )

    try:
        parsed_date = datetime.strptime(data.issue_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    # 1. Create Certificate
    new_cert = Certificate(
        user_id=current_user.id,
        title=course["title"],
        issuer="UiPath Academy",
        issue_date=parsed_date
    )
    db.add(new_cert)

    # 2. Create Badge
    new_badge = Badge(
        user_id=current_user.id,
        badge_name=course["badge_name"]
    )
    db.add(new_badge)
    
    await db.commit()
    
    return {
        "message": "Certificate processed and verified successfully!",
        "badge_earned": course["badge_name"],
        "xp_awarded": course["xp"]
    }

@router.get("/recommendations")
async def get_uipath_recommendations(
    interests: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch user's completed certificates
    cert_result = await db.execute(
        select(Certificate).where(
            Certificate.user_id == current_user.id,
            Certificate.issuer == "UiPath Academy"
        )
    )
    completed_titles = {c.title for c in cert_result.scalars().all()}
    
    interest_list = [i.strip().lower() for i in interests.split(",")] if interests else []
    
    ai_recs = []
    for c in UIPATH_COURSES:
        if c["title"] in completed_titles:
            continue
            
        score = 0
        reason = ""
        
        # Rule-based AI interest matchmaking
        if "excel" in interest_list and "excel" in c["title"].lower():
            score += 3
            reason = "Since you want to learn spreadsheet automation, this course will show you how to read/write Excel files without opening MS Excel."
        elif "ui" in interest_list and "ui" in c["title"].lower():
            score += 3
            reason = "Recommended because you are interested in automating desktop and web browsers using intelligent selectors."
        elif "email" in interest_list and "email" in c["title"].lower():
            score += 3
            reason = "Recommended to help you design automated notifications, email triggers, and clean your inbox using robots."
        elif "pdf" in interest_list and "pdf" in c["title"].lower():
            score += 3
            reason = "Recommended because you indicated interest in document text extraction and optical character recognition (OCR)."
        elif "advanced" in interest_list and c["difficulty"] == "Advanced":
            score += 3
            reason = "Recommended to level up your architectural understanding of state machines and transaction handling."
            
        if score > 0:
            ai_recs.append({
                **c,
                "ai_score": score,
                "ai_reason": reason
            })
            
    # Fallback recommendations (next incomplete steps in timeline)
    if not ai_recs:
        for c in UIPATH_COURSES:
            if c["title"] not in completed_titles:
                ai_recs.append({
                    **c,
                    "ai_score": 1,
                    "ai_reason": "Suggested next step in your sequence to build foundational automation skills."
                })
                if len(ai_recs) >= 2:
                    break
                    
    return ai_recs[:3]

class GeneralCertificateRequest(BaseModel):
    title: str = Field(..., description="Certificate name, e.g. UiPath Automation Developer Associate")
    issuer: str = Field("UiPath Academy", description="Issuer, e.g. UiPath Academy, Coursera")
    issue_date: str = Field(..., description="YYYY-MM-DD")
    verification_url: Optional[str] = Field(None, description="Verification or diploma link")

@router.get("/my-certificates")
async def get_my_certificates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cert_result = await db.execute(
        select(Certificate).where(Certificate.user_id == current_user.id).order_by(Certificate.issue_date.desc())
    )
    badge_result = await db.execute(
        select(Badge).where(Badge.user_id == current_user.id).order_by(Badge.awarded_at.desc())
    )
    
    certs = [
        {
            "id": str(c.id),
            "title": c.title,
            "issuer": c.issuer,
            "issue_date": str(c.issue_date),
            "badge_name": "Verified Credential"
        }
        for c in cert_result.scalars().all()
    ]
    
    badges = [
        {
            "id": str(b.id),
            "badge_name": b.badge_name,
            "awarded_at": b.awarded_at.isoformat()
        }
        for b in badge_result.scalars().all()
    ]
    
    return {
        "certificates": certs,
        "badges": badges
    }

@router.post("/certificates")
async def submit_general_certificate(
    payload: GeneralCertificateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        parsed_date = datetime.strptime(payload.issue_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")

    # Deep Inspection with CertificateInspectorAgent
    is_valid, flaw_reason, _ = await CertificateInspectorAgent.inspect_credential(
        title=payload.title,
        issuer=payload.issuer,
        verification_url=payload.verification_url
    )
    if not is_valid:
        await CertificateInspectorAgent.flag_forgery_and_notify_admin(
            db=db,
            student=current_user,
            certificate_title=payload.title,
            verification_url=payload.verification_url or "None",
            detection_reason=flaw_reason
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Certificate Rejected: {flaw_reason}. An official integrity alert has been recorded on your profile and dispatched to the platform administrator."
        )
        
    cert = Certificate(
        user_id=current_user.id,
        title=payload.title,
        issuer=payload.issuer,
        issue_date=parsed_date
    )
    db.add(cert)
    
    # Also award an achievement badge
    badge = Badge(
        user_id=current_user.id,
        badge_name=f"{payload.title[:30]} Achiever"
    )
    db.add(badge)
    
    await db.commit()
    await db.refresh(cert)
    
    return {
        "message": "Certificate submitted and recorded successfully!",
        "certificate_id": str(cert.id)
    }
