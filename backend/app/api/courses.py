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
