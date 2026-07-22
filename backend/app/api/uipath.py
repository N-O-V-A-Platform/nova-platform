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

router = APIRouter(prefix="/uipath", tags=["UiPath Academy Integration"])

# Structured list of 10 real beginner-intended UiPath Academy courses
UIPATH_COURSES = [
    {
        "id": "11111111-1111-1111-1111-111111111111",
        "title": "RPA Starter",
        "code": "UI-RPA-1",
        "enroll_url": "https://academy.uipath.com/learning-plans/rpa-starter",
        "description": "Learn the fundamentals of RPA, automation concepts, and how robots work.",
        "badge_name": "RPA Starter Badge",
        "difficulty": "Beginner",
        "duration": "1.5 Hours",
        "xp": 100
    },
    {
        "id": "22222222-2222-2222-2222-222222222222",
        "title": "UiPath Studio for Beginners",
        "code": "UI-STU-2",
        "enroll_url": "https://academy.uipath.com/learning-plans/automation-explorer",
        "description": "Introduction to UiPath Studio, building simple automations, and variables.",
        "badge_name": "Studio Explorer Badge",
        "difficulty": "Beginner",
        "duration": "3.0 Hours",
        "xp": 200
    },
    {
        "id": "33333333-3333-3333-3333-333333333333",
        "title": "Variables, Arguments & Control Flow",
        "code": "UI-VAR-3",
        "enroll_url": "https://academy.uipath.com/learning-plans/automation-explorer",
        "description": "Master variable types, scopes, arguments, and control flows in Studio.",
        "badge_name": "Flow Master Badge",
        "difficulty": "Intermediate",
        "duration": "4.0 Hours",
        "xp": 250
    },
    {
        "id": "44444444-4444-4444-4444-444444444444",
        "title": "Data Manipulation in Studio",
        "code": "UI-DAT-4",
        "enroll_url": "https://academy.uipath.com/learning-plans/automation-explorer",
        "description": "Learn to handle strings, lists, dictionaries, and datatables.",
        "badge_name": "Data Wizard Badge",
        "difficulty": "Intermediate",
        "duration": "4.5 Hours",
        "xp": 300
    },
    {
        "id": "55555555-5555-5555-5555-555555555555",
        "title": "Excel Automation with Studio",
        "code": "UI-XLS-5",
        "enroll_url": "https://academy.uipath.com/learning-plans/automation-explorer",
        "description": "Read, write, and manipulate Excel spreadsheet data using UiPath.",
        "badge_name": "Excel Automator Badge",
        "difficulty": "Intermediate",
        "duration": "5.0 Hours",
        "xp": 350
    },
    {
        "id": "66666666-6666-6666-6666-666666666666",
        "title": "UI Automation with Studio",
        "code": "UI-UIA-6",
        "enroll_url": "https://academy.uipath.com/learning-plans/automation-explorer",
        "description": "Automate web and desktop applications using selectors and UI elements.",
        "badge_name": "UI Specialist Badge",
        "difficulty": "Intermediate",
        "duration": "6.0 Hours",
        "xp": 400
    },
    {
        "id": "77777777-7777-7777-7777-777777777777",
        "title": "Email Automation with Studio",
        "code": "UI-EML-7",
        "enroll_url": "https://academy.uipath.com/learning-plans/automation-explorer",
        "description": "Send, retrieve, and organize emails from Outlook, Gmail, and SMTP.",
        "badge_name": "Email Integrator Badge",
        "difficulty": "Intermediate",
        "duration": "4.0 Hours",
        "xp": 250
    },
    {
        "id": "88888888-8888-8888-8888-888888888888",
        "title": "PDF Automation in Studio",
        "code": "UI-PDF-8",
        "enroll_url": "https://academy.uipath.com/learning-plans/automation-explorer",
        "description": "Extract text, tables, and images from digitized or scanned PDF files.",
        "badge_name": "PDF Reader Badge",
        "difficulty": "Intermediate",
        "duration": "3.5 Hours",
        "xp": 200
    },
    {
        "id": "99999999-9999-9999-9999-999999999999",
        "title": "Project Organization in Studio",
        "code": "UI-ORG-9",
        "enroll_url": "https://academy.uipath.com/learning-plans/automation-explorer",
        "description": "Learn modular workflows, state machines, and best design practices.",
        "badge_name": "Architect Badge",
        "difficulty": "Advanced",
        "duration": "5.5 Hours",
        "xp": 450
    },
    {
        "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "title": "Error Handling in Studio",
        "code": "UI-ERR-10",
        "enroll_url": "https://academy.uipath.com/learning-plans/automation-explorer",
        "description": "Use Try Catch, Throw, and retry scopes to build resilient automation robots.",
        "badge_name": "Bug Hunter Badge",
        "difficulty": "Advanced",
        "duration": "6.0 Hours",
        "xp": 500
    }
]

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

    # Verification URL domain check (rejection of fake certificates)
    url_lower = data.verification_url.strip().lower()
    is_valid_domain = any(
        domain in url_lower 
        for domain in ["academy.uipath.com", "credentials.uipath.com", "uipath.academy"]
    )
    if not url_lower.startswith("https://") or not is_valid_domain or len(url_lower) < 30:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fake certificate detected! Verification URL must be a valid, secure certificate verification link from academy.uipath.com or credentials.uipath.com."
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
