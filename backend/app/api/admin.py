import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserResponse

router = APIRouter(prefix="/admin", tags=["Admin Approval"])

@router.get("/pending-lecturers", response_model=List[UserResponse])
async def get_pending_lecturers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User)
        .where(User.status == "Pending Approval")
        .options(selectinload(User.role))
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
async def approve_lecturer(user_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
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
    
    user.is_active = True
    user.status = "Active"
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"message": f"Lecturer {user.first_name} {user.last_name} approved successfully."}

@router.post("/reject-lecturer/{user_id}")
async def reject_lecturer(user_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User)
        .where(User.id == user_id)
    )
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lecturer not found."
        )
    
    user.status = "Rejected"
    user.is_active = False
    db.add(user)
    await db.commit()
    return {"message": f"Lecturer {user.first_name} {user.last_name} registration request rejected."}
