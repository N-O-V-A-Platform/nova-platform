import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

from app.auth.dependencies import RoleChecker
from app.db.session import get_db
from app.models.user import Role, User
from app.schemas.user import UserResponse

router = APIRouter(prefix="/admin", tags=["Admin Approval"])

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
    _: User = Depends(RoleChecker(["Admin"])),
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
    await db.commit()
    await db.refresh(user)
    return {"message": f"Lecturer {user.first_name} {user.last_name} approved successfully."}

@router.post("/reject-lecturer/{user_id}")
async def reject_lecturer(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(RoleChecker(["Admin"])),
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
    await db.commit()
    return {"message": f"Lecturer {user.first_name} {user.last_name} registration request rejected."}
