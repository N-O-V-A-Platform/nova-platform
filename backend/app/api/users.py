from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import Role, User
from app.schemas.user import UserResponse
from app.auth.security import get_password_hash

router = APIRouter(prefix="/users", tags=["Users"])

class PasswordUpdate(BaseModel):
    password: str = Field(..., min_length=6, description="The new password (min 6 characters)")

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    role_name = current_user.role.name if current_user.role else "Student"
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        role_name=role_name,
        institution_id=current_user.institution_id,
        status=current_user.status,
        reminders_enabled=current_user.reminders_enabled
    )

@router.post("/set-password")
async def set_password(
    data: PasswordUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    current_user.password_hash = get_password_hash(data.password)
    db.add(current_user)
    await db.commit()
    return {"message": "Password successfully updated. You can now log in using your email and password."}

@router.post("/request-lecturer-role", response_model=UserResponse)
async def request_lecturer_role(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_role = current_user.role.name if current_user.role else "Student"

    if current_user.is_superuser or current_role == "Admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin accounts cannot request lecturer approval.",
        )
    if current_role == "Lecturer" and current_user.status == "Active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account is already an active lecturer.",
        )
    if current_role == "Lecturer" and current_user.status == "Pending Approval":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lecturer approval is already pending.",
        )

    role_result = await db.execute(select(Role).where(Role.name == "Lecturer"))
    lecturer_role = role_result.scalars().first()
    if not lecturer_role:
        lecturer_role = Role(name="Lecturer")
        db.add(lecturer_role)
        await db.commit()
        await db.refresh(lecturer_role)

    current_user.role = lecturer_role
    current_user.is_active = False
    current_user.status = "Pending Approval"
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        role_name="Lecturer",
        institution_id=current_user.institution_id,
        status=current_user.status,
        reminders_enabled=current_user.reminders_enabled
    )

@router.post("/toggle-reminders")
async def toggle_reminders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    current_user.reminders_enabled = not current_user.reminders_enabled
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return {
        "message": "Reminder preferences updated.",
        "reminders_enabled": current_user.reminders_enabled
    }

@router.post("/send-reminders")
async def send_reminders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Only Admin or Superuser can trigger reminder emails
    current_role = current_user.role.name if current_user.role else "Student"
    if not (current_user.is_superuser or current_role == "Admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admins can dispatch platform reminders."
        )

    # Fetch all users who have reminders enabled
    from app.models.skills import Certificate
    from app.api.uipath import UIPATH_COURSES
    from app.core.email import send_themed_email

    users_result = await db.execute(
        select(User).where(User.reminders_enabled == True)
    )
    users = users_result.scalars().all()

    emails_sent = 0
    for u in users:
        # Check completed courses for this specific user
        cert_result = await db.execute(
            select(Certificate).where(
                Certificate.user_id == u.id,
                Certificate.issuer == "UiPath Academy"
            )
        )
        completed_titles = {c.title for c in cert_result.scalars().all()}

        recommended_course = None
        for c in UIPATH_COURSES:
            if c["title"] not in completed_titles:
                recommended_course = c
                break

        if recommended_course:
            subject = f"Keep going, {u.first_name}! Your N.O.V.A study guide awaits"
            body = (
                f"You are doing incredibly well. Ready to pick up right where you left off? "
                f"Today we recommend checking out your next lesson: **{recommended_course['title']}** ({recommended_course['code']}). "
                f"Completing this will award you with the **{recommended_course['badge_name']}** and +{recommended_course['xp']} XP!"
            )
            action_text = "Start Lesson"
            action_url = recommended_course["enroll_url"]
        else:
            subject = f"Keep the momentum going, {u.first_name}!"
            body = (
                f"Congratulations on completing all your study tracks! "
                f"You can still study with your AI Tutor or review class notes. "
                f"Today is a great day to ask your AI Tutor a question and stay ahead of the class!"
            )
            action_text = "Open AI Tutor"
            action_url = "http://localhost:3000/student/chat"

        send_themed_email(
            to_email=u.email,
            subject=subject,
            title="Daily N.O.V.A Reminder",
            greeting=f"Hi {u.first_name},",
            body_text=body,
            action_text=action_text,
            action_url=action_url
        )
        emails_sent += 1

    return {"message": f"Successfully processed and sent {emails_sent} reminder emails."}


from typing import List
from sqlalchemy.orm import selectinload

class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    first_name: str
    last_name: str
    email: str
    xp: int
    badges_count: int

@router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch all active users with their certificates and badges
    result = await db.execute(
        select(User)
        .where(User.is_active == True)
        .options(selectinload(User.certificates), selectinload(User.badges), selectinload(User.role))
    )
    users = result.scalars().all()

    # Map course titles to their XP values
    from app.api.uipath import UIPATH_COURSES
    course_xp_map = {c["title"]: c["xp"] for c in UIPATH_COURSES}

    leaderboard_data = []
    for u in users:
        # Calculate total XP from certificates
        total_xp = sum(course_xp_map.get(cert.title, 0) for cert in u.certificates if cert.issuer == "UiPath Academy")
        
        role_name = u.role.name if u.role else "Student"
        # Hide Admins from leaderboard
        if role_name == "Admin":
            continue

        leaderboard_data.append({
            "user_id": str(u.id),
            "first_name": u.first_name,
            "last_name": u.last_name,
            "email": u.email,
            "xp": total_xp,
            "badges_count": len(u.badges)
        })

    # Sort by XP descending, then by badges_count descending, then by name
    leaderboard_data.sort(key=lambda x: (-x["xp"], -x["badges_count"], x["first_name"].lower()))

    # Assign ranks
    ranked_leaderboard = []
    for idx, entry in enumerate(leaderboard_data):
        ranked_leaderboard.append(
            LeaderboardEntry(
                rank=idx + 1,
                user_id=entry["user_id"],
                first_name=entry["first_name"],
                last_name=entry["last_name"],
                email=entry["email"],
                xp=entry["xp"],
                badges_count=entry["badges_count"]
            )
        )

    return ranked_leaderboard
