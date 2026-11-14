import uuid
from datetime import datetime
from typing import List, Optional, Any, Dict
from sqlalchemy import String, Text, ForeignKey, DateTime, Integer, Float, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class CourseConcept(Base):
    """
    Nodes in the Learner Knowledge Graph representing individual atomic or
    composite concepts in a course syllabus (e.g., 'Linear Regression', 'Entropy').
    """
    __tablename__ = "course_concepts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    course_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"))
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    difficulty_tier: Mapped[int] = mapped_column(Integer, default=1)  # 1 (Foundational) to 5 (Advanced)
    syllabus_week: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    course: Mapped["Course"] = relationship()
    prerequisites: Mapped[List["ConceptDependency"]] = relationship(
        foreign_keys="[ConceptDependency.target_id]",
        back_populates="target_concept",
        cascade="all, delete-orphan"
    )
    dependents: Mapped[List["ConceptDependency"]] = relationship(
        foreign_keys="[ConceptDependency.prerequisite_id]",
        back_populates="prerequisite_concept",
        cascade="all, delete-orphan"
    )
    learner_states: Mapped[List["StudentKnowledgeState"]] = relationship(
        back_populates="concept",
        cascade="all, delete-orphan"
    )


class ConceptDependency(Base):
    """
    Directed edges in the Knowledge Graph defining prerequisite constraints
    between course concepts (e.g., 'Classification Basics' is a prerequisite of 'Decision Trees').
    """
    __tablename__ = "concept_dependencies"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    prerequisite_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("course_concepts.id", ondelete="CASCADE"))
    target_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("course_concepts.id", ondelete="CASCADE"))
    weight: Mapped[float] = mapped_column(Float, default=1.0) # Criticality of prerequisite (0.0 - 1.0)

    # Relationships
    prerequisite_concept: Mapped["CourseConcept"] = relationship(
        foreign_keys=[prerequisite_id],
        back_populates="dependents"
    )
    target_concept: Mapped["CourseConcept"] = relationship(
        foreign_keys=[target_id],
        back_populates="prerequisites"
    )

    __table_args__ = (
        UniqueConstraint("prerequisite_id", "target_id", name="uq_prerequisite_target"),
    )


class StudentKnowledgeState(Base):
    """
    Persistent state of a student's mastery, confidence, and cognitive flaws
    over an individual concept in the Knowledge Graph.
    """
    __tablename__ = "student_knowledge_states"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    concept_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("course_concepts.id", ondelete="CASCADE"))
    
    # Mastery lifecycle: unseen -> introduced -> practicing -> mastered -> needs_revision
    mastery_status: Mapped[str] = mapped_column(String(50), default="unseen")
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)  # 0.0 to 1.0
    assessments_count: Mapped[int] = mapped_column(Integer, default=0)
    consecutive_correct: Mapped[int] = mapped_column(Integer, default=0)
    
    active_misconceptions: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, default=list)
    last_evaluated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    student: Mapped["User"] = relationship()
    concept: Mapped["CourseConcept"] = relationship(back_populates="learner_states")

    __table_args__ = (
        UniqueConstraint("student_id", "concept_id", name="uq_student_concept_state"),
    )
