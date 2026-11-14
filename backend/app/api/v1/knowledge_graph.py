import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.auth.dependencies import get_current_user, RoleChecker
from app.models.user import User
from app.models.knowledge_graph import CourseConcept, ConceptDependency
from app.schemas.knowledge_graph import (
    ConceptCreate,
    ConceptResponse,
    DependencyCreate,
    DependencyResponse,
    KnowledgeGraphViewResponse,
)
from app.ai.knowledge_graph_service import KnowledgeGraphService

router = APIRouter(prefix="/knowledge-graph", tags=["Learner Knowledge Graph"])


@router.get("/course/{course_id}", response_model=KnowledgeGraphViewResponse)
async def get_course_knowledge_graph(
    course_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves the topological concept graph for a course overlaid with
    the current student's mastery states, confidence scores, and dependencies.
    """
    return await KnowledgeGraphService.get_course_knowledge_graph(
        db=db, student_id=current_user.id, course_id=course_id
    )


@router.post("/concepts", response_model=ConceptResponse, status_code=status.HTTP_201_CREATED)
async def create_concept(
    payload: ConceptCreate,
    course_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Lecturer", "Admin"])),
):
    """Allows faculty to add an atomic concept node to a course syllabus."""
    concept = CourseConcept(
        course_id=course_id,
        name=payload.name,
        slug=payload.slug,
        description=payload.description,
        difficulty_tier=payload.difficulty_tier,
        syllabus_week=payload.syllabus_week,
    )
    db.add(concept)
    await db.commit()
    await db.refresh(concept)
    return concept


@router.post("/dependencies", response_model=DependencyResponse, status_code=status.HTTP_201_CREATED)
async def create_prerequisite_dependency(
    payload: DependencyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Lecturer", "Admin"])),
):
    """Defines a directed prerequisite edge between two syllabus concepts."""
    if payload.prerequisite_id == payload.target_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A concept cannot be a prerequisite of itself."
        )

    dep = ConceptDependency(
        prerequisite_id=payload.prerequisite_id,
        target_id=payload.target_id,
        weight=payload.weight,
    )
    db.add(dep)
    try:
        await db.commit()
        await db.refresh(dep)
    except Exception:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Prerequisite dependency already exists."
        )
    return dep


@router.get("/check-prerequisites/{concept_id}")
async def check_prerequisites(
    concept_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Checks if a student has met all foundational prerequisites before beginning
    instruction on an advanced target concept.
    """
    met, unmet = await KnowledgeGraphService.check_prerequisites_met(
        db=db, student_id=current_user.id, target_concept_id=concept_id
    )
    return {
        "prerequisites_met": met,
        "unmet_prerequisites": unmet,
    }
