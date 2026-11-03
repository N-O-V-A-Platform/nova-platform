import uuid
from statistics import mean
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.ai.llm import complete_json
from app.auth.dependencies import RoleChecker, get_current_user
from app.core.notify import notify_users
from app.db.session import get_db
from app.models.course import Course, Enrollment
from app.models.quiz import Quiz, QuizAttempt
from app.models.skills import Badge
from app.models.user import User
from app.schemas.quiz import (
    QuizCreate,
    QuizGenerateRequest,
    QuizQuestionPublic,
    QuizResponse,
    QuizResultRow,
    QuizSubmitRequest,
)

router = APIRouter(prefix="/quizzes", tags=["Quizzes"])

FALLBACK_QUESTIONS = [
    {
        "prompt": "What is the main benefit of Retrieval-Augmented Generation in a classroom?",
        "options": [
            "It replaces lecturers entirely",
            "It grounds answers in approved course materials",
            "It always answers from the public internet",
            "It disables citations",
        ],
        "correct_index": 1,
        "explanation": "RAG retrieves lecturer-approved notes so answers stay on syllabus.",
    },
    {
        "prompt": "Which data structure is typically used for LIFO ordering?",
        "options": ["Queue", "Stack", "Hash map", "Heap"],
        "correct_index": 1,
        "explanation": "A stack is last-in, first-out.",
    },
    {
        "prompt": "What does a confidence threshold below 85% trigger in N.O.V.A.?",
        "options": [
            "Automatic grade deduction",
            "Lecturer escalation",
            "Account lockout",
            "Certificate revoke",
        ],
        "correct_index": 1,
        "explanation": "Uncertain answers are escalated to the lecturer instead of being guessed.",
    },
    {
        "prompt": "Which Big-O describes binary search on a sorted array?",
        "options": ["O(n)", "O(n log n)", "O(log n)", "O(1)"],
        "correct_index": 2,
        "explanation": "Binary search halves the search space each step.",
    },
    {
        "prompt": "What is the safest way to handle an out-of-syllabus student question?",
        "options": [
            "Invent an answer",
            "Ignore it",
            "Escalate or mark uncertainty",
            "Change the course syllabus immediately",
        ],
        "correct_index": 2,
        "explanation": "Transparent uncertainty plus lecturer review keeps teaching trustworthy.",
    },
]


def _normalize_questions(raw: list, count: int) -> list[dict]:
    questions = []
    source = raw if isinstance(raw, list) else (raw.get("questions") if isinstance(raw, dict) else [])
    source = source or FALLBACK_QUESTIONS
    for item in source[:count]:
        options = list(item.get("options") or [])
        if len(options) < 2:
            continue
        questions.append(
            {
                "id": str(uuid.uuid4()),
                "prompt": str(item.get("prompt") or "Review question"),
                "options": options[:4],
                "correct_index": int(item.get("correct_index") or 0) % min(4, len(options)),
                "explanation": str(item.get("explanation") or ""),
            }
        )
    while len(questions) < count:
        extra = dict(FALLBACK_QUESTIONS[len(questions) % len(FALLBACK_QUESTIONS)])
        extra["id"] = str(uuid.uuid4())
        questions.append(extra)
    return questions


def _public_questions(quiz: Quiz, reveal: bool) -> list[QuizQuestionPublic]:
    items = []
    for question in quiz.questions or []:
        payload = {
            "id": question.get("id"),
            "prompt": question.get("prompt"),
            "options": question.get("options") or [],
        }
        if reveal:
            payload["correct_index"] = question.get("correct_index")
            payload["explanation"] = question.get("explanation")
        items.append(QuizQuestionPublic(**payload))
    return items


def _attempt_payload(attempt: Optional[QuizAttempt]):
    if not attempt:
        return None
    return {
        "id": attempt.id,
        "score": float(attempt.score or 0),
        "answers": attempt.answers or [],
        "submitted_at": attempt.submitted_at,
    }


async def _get_course(db: AsyncSession, course_id: uuid.UUID) -> Course:
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalars().first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


async def _enrolled_ids(db: AsyncSession, course_id: uuid.UUID) -> list[uuid.UUID]:
    result = await db.execute(select(Enrollment.student_id).where(Enrollment.course_id == course_id))
    return list(result.scalars().all())


def _can_manage(user: User, course: Course) -> bool:
    return user.is_superuser or (user.role and user.role.name == "Admin") or course.lecturer_id == user.id


@router.post("/generate", response_model=QuizResponse, status_code=status.HTTP_201_CREATED)
async def generate_quiz(
    payload: QuizGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Lecturer", "Admin", "Student"])),
):
    course = await _get_course(db, payload.course_id)
    count = max(3, min(payload.count, 8))
    fallback = {"questions": FALLBACK_QUESTIONS}
    generated = await complete_json(
        "You generate multiple-choice quizzes for university students. Return JSON: "
        '{"questions":[{"prompt":"...","options":["A","B","C","D"],"correct_index":0,"explanation":"..."}]}',
        f"Create {count} questions about {payload.topic} for the course {course.title} ({course.code}).",
        fallback,
    )
    questions = _normalize_questions(generated, count)
    quiz = Quiz(
        course_id=course.id,
        title=f"{payload.topic} check-in",
        topic=payload.topic,
        generated_by_ai=True,
        is_published=payload.publish and (current_user.role.name != "Student" if current_user.role else True),
        questions=questions,
    )
    if current_user.role and current_user.role.name == "Student":
        quiz.is_published = False
        quiz.title = f"Practice: {payload.topic}"
    db.add(quiz)
    await db.commit()
    await db.refresh(quiz)

    if quiz.is_published:
        student_ids = await _enrolled_ids(db, course.id)
        await notify_users(
            db,
            student_ids,
            f"A new quiz is ready in {course.code}: {quiz.title}",
            title="New quiz",
            category="quiz",
            link="/student/quizzes",
        )
    return await _to_response(db, quiz, current_user)


@router.post("/", response_model=QuizResponse, status_code=status.HTTP_201_CREATED)
async def create_quiz(
    payload: QuizCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Lecturer", "Admin"])),
):
    course = await _get_course(db, payload.course_id)
    if not _can_manage(current_user, course):
        raise HTTPException(status_code=403, detail="Not your course")
    questions = _normalize_questions([q.model_dump() for q in payload.questions], len(payload.questions) or 3)
    quiz = Quiz(
        course_id=course.id,
        title=payload.title,
        topic=payload.topic,
        generated_by_ai=payload.generated_by_ai,
        is_published=payload.is_published,
        questions=questions,
    )
    db.add(quiz)
    await db.commit()
    await db.refresh(quiz)
    if quiz.is_published:
        await notify_users(
            db,
            await _enrolled_ids(db, course.id),
            f"A new quiz is ready in {course.code}: {quiz.title}",
            title="New quiz",
            category="quiz",
            link="/student/quizzes",
        )
    return await _to_response(db, quiz, current_user)


@router.get("/", response_model=list[QuizResponse])
async def list_quizzes(
    course_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Quiz).options(selectinload(Quiz.attempts)).order_by(Quiz.created_at.desc())
    if course_id:
        query = query.where(Quiz.course_id == course_id)
    elif current_user.role and current_user.role.name == "Lecturer":
        query = query.join(Course).where(Course.lecturer_id == current_user.id)
    elif current_user.role and current_user.role.name == "Student":
        query = query.join(Enrollment, Enrollment.course_id == Quiz.course_id).where(
            Enrollment.student_id == current_user.id,
            Quiz.is_published.is_(True),
        )
    result = await db.execute(query)
    quizzes = result.scalars().unique().all()
    return [await _to_response(db, quiz, current_user) for quiz in quizzes]


@router.get("/{quiz_id}", response_model=QuizResponse)
async def get_quiz(
    quiz_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Quiz).where(Quiz.id == quiz_id).options(selectinload(Quiz.attempts)))
    quiz = result.scalars().first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return await _to_response(db, quiz, current_user)


@router.post("/{quiz_id}/publish", response_model=QuizResponse)
async def publish_quiz(
    quiz_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Lecturer", "Admin"])),
):
    result = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = result.scalars().first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    course = await _get_course(db, quiz.course_id)
    if not _can_manage(current_user, course):
        raise HTTPException(status_code=403, detail="Not your course")
    quiz.is_published = True
    await db.commit()
    await db.refresh(quiz)
    await notify_users(
        db,
        await _enrolled_ids(db, course.id),
        f"{course.code}: {quiz.title} is now open.",
        title="Quiz published",
        category="quiz",
        link="/student/quizzes",
    )
    return await _to_response(db, quiz, current_user)


@router.post("/{quiz_id}/submit", response_model=QuizResponse)
async def submit_quiz(
    quiz_id: uuid.UUID,
    payload: QuizSubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Student"])),
):
    result = await db.execute(select(Quiz).where(Quiz.id == quiz_id).options(selectinload(Quiz.attempts)))
    quiz = result.scalars().first()
    if not quiz or not quiz.is_published:
        raise HTTPException(status_code=404, detail="Quiz not found")

    existing = next((item for item in quiz.attempts if item.student_id == current_user.id), None)
    if existing:
        raise HTTPException(status_code=400, detail="You already submitted this quiz")

    answers = []
    correct = 0
    for question in quiz.questions or []:
        selected = payload.answers.get(str(question["id"]))
        is_correct = selected == question.get("correct_index")
        if is_correct:
            correct += 1
        answers.append(
            {
                "question_id": question["id"],
                "selected": selected,
                "correct": is_correct,
            }
        )
    total = max(len(quiz.questions or []), 1)
    score = round((correct / total) * 100, 2)
    attempt = QuizAttempt(quiz_id=quiz.id, student_id=current_user.id, score=score, answers=answers)
    db.add(attempt)
    if score >= 80:
        db.add(Badge(user_id=current_user.id, badge_name=f"Quiz Ace · {quiz.title[:40]}"))
    await db.commit()
    await db.refresh(quiz)
    return await _to_response(db, quiz, current_user)


@router.get("/{quiz_id}/results", response_model=list[QuizResultRow])
async def quiz_results(
    quiz_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Lecturer", "Admin"])),
):
    quiz_result = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = quiz_result.scalars().first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    course = await _get_course(db, quiz.course_id)
    if not _can_manage(current_user, course):
        raise HTTPException(status_code=403, detail="Not your course")
    result = await db.execute(
        select(QuizAttempt, User)
        .join(User, User.id == QuizAttempt.student_id)
        .where(QuizAttempt.quiz_id == quiz_id)
        .order_by(QuizAttempt.submitted_at.desc())
    )
    rows = []
    for attempt, student in result.all():
        rows.append(
            QuizResultRow(
                student_id=student.id,
                student_name=f"{student.first_name} {student.last_name}",
                score=float(attempt.score or 0),
                submitted_at=attempt.submitted_at,
            )
        )
    return rows


async def _to_response(db: AsyncSession, quiz: Quiz, user: User) -> QuizResponse:
    attempts = quiz.attempts if "attempts" in quiz.__dict__ else []
    mine = next((item for item in attempts if item.student_id == user.id), None)
    is_staff = bool(user.role and user.role.name in {"Lecturer", "Admin"}) or user.is_superuser
    reveal = is_staff or mine is not None
    scores = [float(item.score or 0) for item in attempts]
    return QuizResponse(
        id=quiz.id,
        course_id=quiz.course_id,
        title=quiz.title,
        topic=quiz.topic,
        generated_by_ai=quiz.generated_by_ai,
        is_published=quiz.is_published,
        created_at=quiz.created_at,
        question_count=len(quiz.questions or []),
        questions=_public_questions(quiz, reveal),
        my_attempt=_attempt_payload(mine),
        attempt_count=len(attempts) if is_staff else None,
        average_score=round(mean(scores), 1) if scores and is_staff else None,
    )
