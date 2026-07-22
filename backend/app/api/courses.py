from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

from app.db.session import get_db
from app.models.course import Course, Enrollment
from app.models.user import User
from app.schemas.course import CourseCreate, CourseResponse, EnrollmentResponse
from app.auth.dependencies import get_current_user, RoleChecker

router = APIRouter(prefix="/courses", tags=["Courses"])

@router.post("/", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
async def create_course(
    course_in: CourseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Lecturer", "Admin"]))
):
    # Check if code already exists
    result = await db.execute(select(Course).where(Course.code == course_in.code))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Course with this code already exists")
    
    course = Course(
        title=course_in.title,
        code=course_in.code,
        semester=course_in.semester,
        credits=course_in.credits,
        department_id=course_in.department_id,
        lecturer_id=current_user.id
    )
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return course

@router.get("/", response_model=List[CourseResponse])
async def list_courses(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Course))
    return result.scalars().all()

@router.get("/enrolled", response_model=List[CourseResponse])
async def list_enrolled_courses(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Course)
        .join(Enrollment, Course.id == Enrollment.course_id)
        .where(Enrollment.student_id == current_user.id)
    )
    return result.scalars().all()

@router.post("/enroll", response_model=EnrollmentResponse, status_code=status.HTTP_201_CREATED)
async def enroll_course(
    course_id_in: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Student"]))
):
    import uuid
    try:
        course_id = uuid.UUID(course_id_in)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid course ID format")

    # Check if course exists
    course_result = await db.execute(select(Course).where(Course.id == course_id))
    course = course_result.scalars().first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Check if already enrolled
    enr_result = await db.execute(
        select(Enrollment)
        .where(Enrollment.student_id == current_user.id)
        .where(Enrollment.course_id == course_id)
    )
    if enr_result.scalars().first():
        raise HTTPException(status_code=400, detail="Student is already enrolled in this course")

    enrollment = Enrollment(
        student_id=current_user.id,
        course_id=course_id
    )
    db.add(enrollment)
    await db.commit()
    await db.refresh(enrollment)
    return enrollment

@router.get("/announcements", response_model=List[str])
async def get_announcements(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.resource import Resource
    from app.core.config import settings
    from openai import AsyncOpenAI
    
    announcements = []
    
    # 1. Fetch user's enrolled courses
    enr_result = await db.execute(
        select(Enrollment).where(Enrollment.student_id == current_user.id)
    )
    enrollments = enr_result.scalars().all()
    course_ids = [e.course_id for e in enrollments]
    
    if course_ids:
        # Fetch resources for these courses (latest 3 resources)
        res_result = await db.execute(
            select(Resource, Course)
            .join(Course, Resource.course_id == Course.id)
            .where(Resource.course_id.in_(course_ids))
            .order_by(Resource.created_at.desc())
            .limit(3)
        )
        for resource, course in res_result.all():
            announcements.append(
                f"New materials for {course.code} ({resource.file_name}) have been uploaded and indexed."
            )
            
    # 2. If we need more announcements, let the AI generate one!
    if len(announcements) < 3:
        ai_announcement = None
        use_groq = bool(settings.GROQ_API_KEY)
        use_openrouter = bool(settings.OPENROUTER_API_KEY)
        
        system_prompt = (
            "You are N.O.V.A., an AI educational assistant. "
            "Generate a single, short, encouraging 1-sentence announcement, study tip, or motivation for a student log-in dashboard. "
            "Keep it under 15 words. Do not use quotes or prefixes."
        )
        
        if use_groq:
            try:
                groq_client = AsyncOpenAI(api_key=settings.GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")
                response = await groq_client.chat.completions.create(
                    model="llama-3.1-8b-instant",
                    messages=[{"role": "system", "content": system_prompt}],
                    temperature=0.7,
                    max_tokens=30
                )
                ai_announcement = response.choices[0].message.content.strip()
            except:
                pass
                
        if not ai_announcement and use_openrouter:
            try:
                openrouter_client = AsyncOpenAI(api_key=settings.OPENROUTER_API_KEY, base_url="https://openrouter.ai/api/v1")
                response = await openrouter_client.chat.completions.create(
                    model="meta-llama/llama-3.1-8b-instruct:free",
                    messages=[{"role": "system", "content": system_prompt}],
                    temperature=0.7,
                    max_tokens=30
                )
                ai_announcement = response.choices[0].message.content.strip()
            except:
                pass
                
        if ai_announcement:
            announcements.append(ai_announcement)
        else:
            announcements.append("Welcome to N.O.V.A! Your AI assistant is fully grounded in your slides.")
            
    if len(announcements) < 2:
        announcements.append("Stay curious and keep exploring your courses!")
        
    return announcements

@router.get("/study-tip", response_model=dict)
async def get_ai_study_tip(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.core.config import settings
    from openai import AsyncOpenAI
    
    use_groq = bool(settings.GROQ_API_KEY)
    use_openrouter = bool(settings.OPENROUTER_API_KEY)
    
    system_prompt = (
        "You are N.O.V.A., an AI educational assistant. "
        "Generate a single, highly actionable, encouraging study tip or memory technique for a college student. "
        "Keep it under 25 words. Do not use quotes or prefixes. Be direct."
    )
    
    tip = "Break your study sessions into 25-minute blocks using the Pomodoro technique to stay focused."
    
    if use_groq:
        try:
            groq_client = AsyncOpenAI(api_key=settings.GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")
            response = await groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "system", "content": system_prompt}],
                temperature=0.8,
                max_tokens=40
            )
            tip = response.choices[0].message.content.strip()
        except:
            pass
    elif use_openrouter:
        try:
            openrouter_client = AsyncOpenAI(api_key=settings.OPENROUTER_API_KEY, base_url="https://openrouter.ai/api/v1")
            response = await openrouter_client.chat.completions.create(
                model="meta-llama/llama-3.1-8b-instruct:free",
                messages=[{"role": "system", "content": system_prompt}],
                temperature=0.8,
                max_tokens=40
            )
            tip = response.choices[0].message.content.strip()
        except:
            pass
            
    return {"tip": tip}
