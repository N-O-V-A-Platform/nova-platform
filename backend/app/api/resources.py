from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
import uuid

from app.db.session import get_db
from app.models.resource import Resource
from app.models.course import Course
from app.models.user import User
from app.schemas.resource import ResourceCreate, ResourceResponse
from app.auth.dependencies import get_current_user, RoleChecker

router = APIRouter(prefix="/resources", tags=["Resources"])

@router.post("/", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
async def create_resource(
    resource_in: ResourceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Lecturer", "Admin"]))
):
    # Check if course exists
    course_result = await db.execute(select(Course).where(Course.id == resource_in.course_id))
    course = course_result.scalars().first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    resource = Resource(
        course_id=resource_in.course_id,
        lecture_id=resource_in.lecture_id,
        file_name=resource_in.file_name,
        file_type=resource_in.file_type,
        storage_url=resource_in.storage_url,
        uploaded_by=current_user.id
    )
    db.add(resource)
    await db.commit()
    await db.refresh(resource)
    return resource

@router.get("/course/{course_id}", response_model=List[ResourceResponse])
async def list_course_resources(
    course_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Resource).where(Resource.course_id == course_id)
    )
    return result.scalars().all()
