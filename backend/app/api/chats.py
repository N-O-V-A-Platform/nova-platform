import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.ai import AIConversation, Question, Escalation
from app.models.course import Course
from app.models.resource import KnowledgeBase, Resource
from app.models.user import User
from app.schemas.ai import (
    AIConversationCreate,
    AIConversationResponse,
    AIConversationDetailResponse,
    QuestionCreate,
    QuestionResponse,
    EscalationDetailResponse
)
from app.auth.dependencies import get_current_user, RoleChecker
from app.ai.rag_service import RAGService

router = APIRouter(prefix="/chats", tags=["AI Conversations"])
rag_service = RAGService()

@router.post("/", response_model=AIConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    conv_in: AIConversationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if course exists
    course_result = await db.execute(select(Course).where(Course.id == conv_in.course_id))
    course = course_result.scalars().first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Set default title if not provided
    title = conv_in.title or f"Chat about {course.title}"

    conversation = AIConversation(
        user_id=current_user.id,
        course_id=conv_in.course_id,
        title=title
    )
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    return conversation

@router.get("/", response_model=List[AIConversationResponse])
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(AIConversation)
        .where(AIConversation.user_id == current_user.id)
        .order_by(AIConversation.created_at.desc())
    )
    return result.scalars().all()

@router.get("/{conversation_id}", response_model=AIConversationDetailResponse)
async def get_conversation(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(AIConversation)
        .where(AIConversation.id == conversation_id)
        .options(selectinload(AIConversation.questions))
    )
    conversation = result.scalars().first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Access control check: Must be the conversation owner or the course lecturer
    if conversation.user_id != current_user.id:
        course_result = await db.execute(
            select(Course).where(Course.id == conversation.course_id)
        )
        course = course_result.scalars().first()
        if not course or course.lecturer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this conversation")

    # Sort questions by creation date
    conversation.questions.sort(key=lambda q: q.created_at)
    return conversation

@router.post("/{conversation_id}/questions", response_model=QuestionResponse)
async def ask_question(
    conversation_id: uuid.UUID,
    question_in: QuestionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Fetch conversation
    conv_result = await db.execute(
        select(AIConversation).where(AIConversation.id == conversation_id)
    )
    conversation = conv_result.scalars().first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if conversation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the conversation owner can ask questions")

    # Fetch course
    course_result = await db.execute(
        select(Course).where(Course.id == conversation.course_id)
    )
    course = course_result.scalars().first()
    if not course:
        raise HTTPException(status_code=404, detail="Course associated with conversation not found")

    # 2. Gather course namespaces from knowledge base
    kb_result = await db.execute(
        select(KnowledgeBase.pinecone_namespace)
        .join(Resource)
        .where(Resource.course_id == conversation.course_id)
    )
    namespaces = kb_result.scalars().all()
    
    # If no indexed namespaces yet, default to a course-specific namespace string
    namespace = namespaces[0] if namespaces else f"course_{course.id}"

    # 3. Retrieve conversation history (last 5 QAs) for context
    history_result = await db.execute(
        select(Question)
        .where(Question.conversation_id == conversation_id)
        .order_by(Question.created_at.desc())
        .limit(5)
    )
    history_list = list(reversed(history_result.scalars().all()))
    chat_history = []
    for h in history_list:
        chat_history.append({"role": "user", "content": h.question})
        if h.response:
            chat_history.append({"role": "assistant", "content": h.response})

    # 4. Generate RAG answer
    answer, confidence_score, should_escalate = await rag_service.get_response(
        query=question_in.question,
        course_id=str(conversation.course_id),
        namespace=namespace,
        chat_history=chat_history
    )

    # 5. Create Question DB record
    question_record = Question(
        conversation_id=conversation_id,
        question=question_in.question,
        response=answer,
        confidence_score=confidence_score
    )
    db.add(question_record)
    await db.commit()
    await db.refresh(question_record)

    # 6. Trigger escalation if confidence is low
    if should_escalate:
        escalation = Escalation(
            question_id=question_record.id,
            lecturer_id=course.lecturer_id,
            status="Pending"
        )
        db.add(escalation)
        await db.commit()

    return question_record

@router.get("/escalations/pending", response_model=List[EscalationDetailResponse])
async def list_pending_escalations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Lecturer", "Admin"]))
):
    """
    Lists all pending escalations for the logged-in lecturer.
    """
    result = await db.execute(
        select(Escalation)
        .where(Escalation.lecturer_id == current_user.id)
        .where(Escalation.status == "Pending")
        .options(selectinload(Escalation.question))
        .order_by(Escalation.escalated_at.asc())
    )
    return result.scalars().all()

@router.post("/escalations/{escalation_id}/resolve", response_model=QuestionResponse)
async def resolve_escalation(
    escalation_id: uuid.UUID,
    response_text: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Lecturer", "Admin"]))
):
    """
    Lecturer provides a manual answer to a pending escalated question.
    """
    result = await db.execute(
        select(Escalation)
        .where(Escalation.id == escalation_id)
        .options(selectinload(Escalation.question))
    )
    escalation = result.scalars().first()
    if not escalation:
        raise HTTPException(status_code=404, detail="Escalation not found")

    if escalation.lecturer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to resolve this escalation")

    if escalation.status != "Pending":
        raise HTTPException(status_code=400, detail="Escalation has already been resolved or closed")

    # Update question response
    question = escalation.question
    question.response = response_text
    question.confidence_score = 1.0  # Perfect human confidence

    # Update escalation status
    escalation.status = "Resolved"
    
    await db.commit()
    await db.refresh(question)
    return question
