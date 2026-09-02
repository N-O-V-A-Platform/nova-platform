import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.ai_teacher import LearningSession, LessonPlan, LessonSection, TeachingInteraction, Misconception
from app.schemas.ai_teacher import (
    CreateSessionRequest,
    SessionDetailResponse,
    StepInteractionResponse,
    StudentAnswerRequest,
    EvaluationResponse
)
from app.ai.teacher_agent import AITeacherAgent
from app.ai.tts_avatar_service import TTSAvatarService
from app.ai.rag_service import RAGService

router = APIRouter(prefix="/ai-teacher", tags=["AI Teacher"])

teacher_agent = AITeacherAgent()
tts_avatar_service = TTSAvatarService()
rag_service = RAGService()


@router.post("/sessions", response_model=SessionDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_learning_session(
    payload: CreateSessionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Creates an adaptive learning session, retrieves course context via RAG if course_id is provided,
    and generates a tailored 5-7 step Lesson Plan.
    """
    rag_context = ""
    if payload.course_id:
        try:
            # Query vector store for course material grounding
            query_emb = await rag_service.embedding_service.get_embedding(f"{payload.title} {payload.learning_goal}")
            matches = await rag_service.vector_store.query_chunks(
                query_embedding=query_emb,
                namespace=f"course_{payload.course_id}",
                top_k=4
            )
            rag_context = "\n---\n".join([m["text"] for m in matches])
        except Exception as e:
            print(f"[AITeacherRouter] RAG context fetch failed: {e}")

    # Generate lesson plan JSON from Teacher Agent
    plan_data = await teacher_agent.generate_lesson_plan(
        topic=payload.title,
        student_level=payload.student_level,
        language=payload.language,
        time_mins=payload.available_time_mins,
        learning_goal=payload.learning_goal,
        rag_context=rag_context
    )

    # Save Session
    session = LearningSession(
        user_id=current_user.id,
        course_id=payload.course_id,
        title=payload.title,
        student_level=payload.student_level,
        language=payload.language,
        available_time_mins=payload.available_time_mins,
        learning_goal=payload.learning_goal,
        source_material_title=payload.title,
        status="active",
        current_section_index=0,
        current_step_type="EXPLANATION"
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    # Save Lesson Plan
    raw_sections = plan_data.get("sections", [])
    plan = LessonPlan(
        session_id=session.id,
        overview=plan_data.get("overview", f"Adaptive session on {payload.title}"),
        total_sections=len(raw_sections)
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)

    # Save Sections
    for idx, s in enumerate(raw_sections):
        section = LessonSection(
            lesson_plan_id=plan.id,
            section_order=idx,
            title=s.get("title", f"Section {idx+1}"),
            duration_mins=s.get("duration_mins", 4),
            key_concepts={"concepts": s.get("key_concepts", [])},
            status="in_progress" if idx == 0 else "pending"
        )
        db.add(section)

    await db.commit()

    # Refetch session with eager loading
    result = await db.execute(
        select(LearningSession)
        .where(LearningSession.id == session.id)
        .options(
            selectinload(LearningSession.lesson_plan).selectinload(LessonPlan.sections),
            selectinload(LearningSession.misconceptions)
        )
    )
    full_session = result.scalars().first()
    return full_session


@router.get("/sessions", response_model=List[SessionDetailResponse])
async def list_user_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists all learning sessions for the current student."""
    result = await db.execute(
        select(LearningSession)
        .where(LearningSession.user_id == current_user.id)
        .options(
            selectinload(LearningSession.lesson_plan).selectinload(LessonPlan.sections),
            selectinload(LearningSession.misconceptions)
        )
        .order_by(LearningSession.created_at.desc())
    )
    return result.scalars().all()


@router.get("/sessions/{session_id}", response_model=SessionDetailResponse)
async def get_session_details(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetches comprehensive session details, lesson plan, and misconception history."""
    result = await db.execute(
        select(LearningSession)
        .where(LearningSession.id == session_id)
        .where(LearningSession.user_id == current_user.id)
        .options(
            selectinload(LearningSession.lesson_plan).selectinload(LessonPlan.sections),
            selectinload(LearningSession.misconceptions)
        )
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Learning session not found")
    return session


@router.post("/sessions/{session_id}/next", response_model=StepInteractionResponse)
async def fetch_next_step(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Advances to the next section or step. Generates teacher script, visual diagram spec,
    TTS audio payload, and check-for-understanding question.
    """
    result = await db.execute(
        select(LearningSession)
        .where(LearningSession.id == session_id)
        .where(LearningSession.user_id == current_user.id)
        .options(
            selectinload(LearningSession.lesson_plan).selectinload(LessonPlan.sections)
        )
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Learning session not found")

    sections = session.lesson_plan.sections if session.lesson_plan else []
    if not sections:
        raise HTTPException(status_code=400, detail="Lesson plan has no sections")

    idx = min(session.current_section_index, len(sections) - 1)
    current_section = sections[idx]
    concepts = current_section.key_concepts.get("concepts", []) if current_section.key_concepts else []

    # Generate interactive script & visual spec
    step_data = await teacher_agent.generate_section_interaction(
        section_title=current_section.title,
        key_concepts=concepts,
        student_level=session.student_level,
        language=session.language
    )

    teacher_script = step_data.get("teacher_script", f"Let's learn about {current_section.title}.")
    visual_spec = step_data.get("visual_spec", {})
    question = step_data.get("question", "Does this concept make sense so far?")

    # Synthesize Audio Voice
    tts_result = await tts_avatar_service.generate_speech_audio(
        text=teacher_script,
        language=session.language
    )
    avatar_config = tts_avatar_service.get_avatar_payload(teacher_name="Dr. Nova", state="speaking")

    # Persist interaction
    interaction = TeachingInteraction(
        session_id=session.id,
        section_id=current_section.id,
        step_type="EXPLANATION",
        teacher_script=teacher_script,
        visual_spec=visual_spec,
        audio_url=tts_result.get("audio_data_url")
    )
    db.add(interaction)

    # Advance section index for next turn if appropriate
    if session.current_section_index < len(sections) - 1:
        session.current_section_index += 1

    await db.commit()

    return StepInteractionResponse(
        session_id=session.id,
        section_id=current_section.id,
        section_title=current_section.title,
        section_index=idx + 1,
        total_sections=len(sections),
        step_type="EXPLANATION",
        teacher_script=teacher_script,
        visual_spec=visual_spec,
        audio_data_url=tts_result.get("audio_data_url"),
        voice_used=tts_result.get("voice_used"),
        avatar_config=avatar_config,
        question=question,
        citations=step_data.get("citations")
    )


@router.post("/sessions/{session_id}/respond", response_model=EvaluationResponse)
async def submit_student_response(
    session_id: uuid.UUID,
    payload: StudentAnswerRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submits student response for evaluation.
    If a misconception is detected, the Adaptive Engine changes strategy (e.g. water-pipe analogy),
    generates a remedy script, simplified question, and updated visual spec.
    """
    result = await db.execute(
        select(LearningSession)
        .where(LearningSession.id == session_id)
        .where(LearningSession.user_id == current_user.id)
        .options(
            selectinload(LearningSession.lesson_plan).selectinload(LessonPlan.sections)
        )
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Learning session not found")

    sections = session.lesson_plan.sections if session.lesson_plan else []
    current_section = sections[min(session.current_section_index, len(sections) - 1)] if sections else None
    section_title = current_section.title if current_section else session.title

    # Evaluate response with Adaptive Engine
    eval_result = await teacher_agent.evaluate_and_adapt(
        question=f"Question regarding {section_title}",
        student_response=payload.response_text,
        topic_context=session.title,
        language=session.language
    )

    is_correct = bool(eval_result.get("is_correct", False))
    misconception_detected = bool(eval_result.get("misconception_detected", False))
    remedy_script = eval_result.get("remedy_script", "Great effort! Let's continue.")
    simplified_q = eval_result.get("simplified_question", "Ready for the next step?")
    visual_spec = eval_result.get("visual_spec", {})

    # Save misconception if detected
    if misconception_detected:
        misc = Misconception(
            session_id=session.id,
            topic=section_title,
            misconception_text=eval_result.get("misconception_explanation", "Misconception detected"),
            remedy_applied=eval_result.get("remedy_strategy", "ANALOGY"),
            confidence=float(eval_result.get("confidence", 0.85)),
            resolved=False
        )
        db.add(misc)

    # Synthesize Audio for remedy/feedback script
    tts_result = await tts_avatar_service.generate_speech_audio(
        text=remedy_script,
        language=session.language,
        voice_preset=payload.voice_preset or "dr_nova",
        speech_rate=payload.speech_rate or 1.0
    )
    avatar_config = tts_avatar_service.get_avatar_payload(teacher_name="Dr. Nova", state="speaking")

    # Save interaction
    interaction = TeachingInteraction(
        session_id=session.id,
        section_id=current_section.id if current_section else None,
        step_type="MISCONCEPTION_REMEDY" if misconception_detected else "EVALUATION",
        teacher_script=remedy_script,
        visual_spec=visual_spec,
        audio_url=tts_result.get("audio_data_url"),
        student_response=payload.response_text,
        is_correct=is_correct,
        evaluation_notes=eval_result.get("misconception_explanation")
    )
    db.add(interaction)
    await db.commit()

    return EvaluationResponse(
        session_id=session.id,
        is_correct=is_correct,
        confidence=float(eval_result.get("confidence", 0.9)),
        misconception_detected=misconception_detected,
        misconception_title=eval_result.get("misconception_title"),
        misconception_explanation=eval_result.get("misconception_explanation"),
        remedy_script=remedy_script,
        simplified_question=simplified_q,
        visual_spec=visual_spec,
        audio_data_url=tts_result.get("audio_data_url"),
        voice_used=tts_result.get("voice_used"),
        avatar_config=avatar_config,
        citations=eval_result.get("citations")
    )
