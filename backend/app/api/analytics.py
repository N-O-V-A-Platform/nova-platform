from statistics import mean

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import RoleChecker, get_current_user
from app.db.session import get_db
from app.models.ai import AIConversation, Escalation, Question
from app.models.classroom import AttendanceRecord, LiveSession
from app.models.course import Course, Enrollment
from app.models.quiz import Quiz, QuizAttempt
from app.models.resource import Resource
from app.models.skills import Badge, Certificate
from app.models.user import Role, User

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/student")
async def student_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    enrolled = await db.execute(select(func.count()).select_from(Enrollment).where(Enrollment.student_id == current_user.id))
    questions = await db.execute(
        select(func.count())
        .select_from(Question)
        .join(AIConversation, Question.conversation_id == AIConversation.id)
        .where(AIConversation.user_id == current_user.id)
    )
    attempts = (
        await db.execute(select(QuizAttempt).where(QuizAttempt.student_id == current_user.id))
    ).scalars().all()
    badges = await db.execute(select(func.count()).select_from(Badge).where(Badge.user_id == current_user.id))
    certs = await db.execute(select(func.count()).select_from(Certificate).where(Certificate.user_id == current_user.id))
    attendance = await db.execute(
        select(func.count()).select_from(AttendanceRecord).where(AttendanceRecord.student_id == current_user.id)
    )
    scores = [float(item.score or 0) for item in attempts]
    weak_topics = []
    if scores:
        quiz_rows = await db.execute(
            select(QuizAttempt, Quiz)
            .join(Quiz, Quiz.id == QuizAttempt.quiz_id)
            .where(QuizAttempt.student_id == current_user.id)
            .order_by(QuizAttempt.submitted_at.desc())
        )
        for attempt, quiz in quiz_rows.all():
            if float(attempt.score or 0) < 70:
                weak_topics.append({"topic": quiz.topic or quiz.title, "score": float(attempt.score or 0)})
    return {
        "courses_enrolled": enrolled.scalar() or 0,
        "questions_asked": questions.scalar() or 0,
        "quizzes_taken": len(attempts),
        "average_quiz_score": round(mean(scores), 1) if scores else None,
        "best_quiz_score": round(max(scores), 1) if scores else None,
        "attendance_checkins": attendance.scalar() or 0,
        "badges": badges.scalar() or 0,
        "certificates": certs.scalar() or 0,
        "weak_topics": weak_topics[:5],
        "recent_scores": [
            {"score": float(item.score or 0), "submitted_at": item.submitted_at.isoformat()}
            for item in sorted(attempts, key=lambda a: a.submitted_at, reverse=True)[:8]
        ],
    }


@router.get("/lecturer")
async def lecturer_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Lecturer", "Admin"])),
):
    courses = (await db.execute(select(Course).where(Course.lecturer_id == current_user.id))).scalars().all()
    course_ids = [course.id for course in courses]
    if not course_ids:
        return {
            "courses": 0,
            "students": 0,
            "questions_asked": 0,
            "pending_escalations": 0,
            "resources": 0,
            "live_sessions": 0,
            "average_quiz_score": None,
            "attendance_rate": None,
            "difficult_topics": [],
            "course_breakdown": [],
        }

    students = await db.execute(
        select(func.count(func.distinct(Enrollment.student_id))).where(Enrollment.course_id.in_(course_ids))
    )
    questions = await db.execute(
        select(func.count())
        .select_from(Question)
        .join(AIConversation, Question.conversation_id == AIConversation.id)
        .where(AIConversation.course_id.in_(course_ids))
    )
    pending = await db.execute(
        select(func.count()).select_from(Escalation).where(
            Escalation.lecturer_id == current_user.id,
            Escalation.status == "Pending",
        )
    )
    resources = await db.execute(select(func.count()).select_from(Resource).where(Resource.course_id.in_(course_ids)))
    lives = await db.execute(select(func.count()).select_from(LiveSession).where(LiveSession.course_id.in_(course_ids)))
    attempts = (
        await db.execute(
            select(QuizAttempt).join(Quiz, Quiz.id == QuizAttempt.quiz_id).where(Quiz.course_id.in_(course_ids))
        )
    ).scalars().all()
    scores = [float(item.score or 0) for item in attempts]
    low_quizzes = (
        await db.execute(
            select(Quiz.title, Quiz.topic, func.avg(QuizAttempt.score))
            .join(QuizAttempt, QuizAttempt.quiz_id == Quiz.id)
            .where(Quiz.course_id.in_(course_ids))
            .group_by(Quiz.id)
            .order_by(func.avg(QuizAttempt.score).asc())
            .limit(5)
        )
    ).all()

    breakdown = []
    for course in courses:
        enrolled = await db.execute(select(func.count()).select_from(Enrollment).where(Enrollment.course_id == course.id))
        asked = await db.execute(
            select(func.count())
            .select_from(Question)
            .join(AIConversation, Question.conversation_id == AIConversation.id)
            .where(AIConversation.course_id == course.id)
        )
        present = await db.execute(
            select(func.count())
            .select_from(AttendanceRecord)
            .join(LiveSession, LiveSession.id == AttendanceRecord.session_id)
            .where(LiveSession.course_id == course.id)
        )
        breakdown.append(
            {
                "course_id": str(course.id),
                "code": course.code,
                "title": course.title,
                "students": enrolled.scalar() or 0,
                "questions": asked.scalar() or 0,
                "attendance_checkins": present.scalar() or 0,
            }
        )

    enrolled_total = students.scalar() or 0
    present_total = sum(item["attendance_checkins"] for item in breakdown)
    return {
        "courses": len(courses),
        "students": enrolled_total,
        "questions_asked": questions.scalar() or 0,
        "pending_escalations": pending.scalar() or 0,
        "resources": resources.scalar() or 0,
        "live_sessions": lives.scalar() or 0,
        "average_quiz_score": round(mean(scores), 1) if scores else None,
        "attendance_rate": round((present_total / max(enrolled_total, 1)) * 100, 1) if enrolled_total else None,
        "difficult_topics": [
            {"topic": row[1] or row[0], "average_score": round(float(row[2] or 0), 1)}
            for row in low_quizzes
        ],
        "course_breakdown": breakdown,
    }


@router.get("/institution")
async def institution_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Admin"])),
):
    users = await db.execute(select(func.count()).select_from(User))
    students = await db.execute(
        select(func.count()).select_from(User).join(Role, User.role_id == Role.id).where(Role.name == "Student")
    )
    lecturers = await db.execute(
        select(func.count()).select_from(User).join(Role, User.role_id == Role.id).where(Role.name == "Lecturer")
    )
    courses = await db.execute(select(func.count()).select_from(Course))
    enrollments = await db.execute(select(func.count()).select_from(Enrollment))
    quizzes = await db.execute(select(func.count()).select_from(QuizAttempt))
    certificates = await db.execute(select(func.count()).select_from(Certificate))
    live = await db.execute(select(func.count()).select_from(LiveSession))
    avg_score = await db.execute(select(func.avg(QuizAttempt.score)))
    return {
        "users": users.scalar() or 0,
        "students": students.scalar() or 0,
        "lecturers": lecturers.scalar() or 0,
        "courses": courses.scalar() or 0,
        "enrollments": enrollments.scalar() or 0,
        "quiz_attempts": quizzes.scalar() or 0,
        "certificates": certificates.scalar() or 0,
        "live_sessions": live.scalar() or 0,
        "average_quiz_score": round(float(avg_score.scalar() or 0), 1) if avg_score.scalar() is not None else None,
    }
