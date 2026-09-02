import uuid
from datetime import datetime
from typing import List, Optional, Any, Dict
from sqlalchemy import String, Text, ForeignKey, DateTime, Integer, Boolean, Float, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class LearningSession(Base):
    __tablename__ = "learning_sessions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    course_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("courses.id", ondelete="SET NULL"), nullable=True)
    
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    student_level: Mapped[str] = mapped_column(String(100), default="Class 10")  # e.g., Class 10, Beginner, Undergraduate
    language: Mapped[str] = mapped_column(String(50), default="Hinglish")        # Hinglish, English, Hindi, Spanish
    available_time_mins: Mapped[int] = mapped_column(Integer, default=20)
    learning_goal: Mapped[str] = mapped_column(Text, nullable=False)
    source_material_title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    status: Mapped[str] = mapped_column(String(50), default="active")          # active, completed, paused
    current_section_index: Mapped[int] = mapped_column(Integer, default=0)
    current_step_type: Mapped[str] = mapped_column(String(50), default="EXPLANATION")
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship()
    lesson_plan: Mapped[Optional["LessonPlan"]] = relationship(back_populates="session", uselist=False, cascade="all, delete-orphan")
    interactions: Mapped[List["TeachingInteraction"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    misconceptions: Mapped[List["Misconception"]] = relationship(back_populates="session", cascade="all, delete-orphan")

class LessonPlan(Base):
    __tablename__ = "lesson_plans"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("learning_sessions.id", ondelete="CASCADE"), unique=True)
    
    overview: Mapped[str] = mapped_column(Text, nullable=False)
    total_sections: Mapped[int] = mapped_column(Integer, default=5)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    session: Mapped["LearningSession"] = relationship(back_populates="lesson_plan")
    sections: Mapped[List["LessonSection"]] = relationship(back_populates="lesson_plan", cascade="all, delete-orphan", order_by="LessonSection.section_order")

class LessonSection(Base):
    __tablename__ = "lesson_sections"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    lesson_plan_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("lesson_plans.id", ondelete="CASCADE"))
    
    section_order: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    duration_mins: Mapped[int] = mapped_column(Integer, default=3)
    key_concepts: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True) # list of concept strings or dict
    status: Mapped[str] = mapped_column(String(50), default="pending")                  # pending, in_progress, completed

    # Relationships
    lesson_plan: Mapped["LessonPlan"] = relationship(back_populates="sections")
    interactions: Mapped[List["TeachingInteraction"]] = relationship(back_populates="section", cascade="all, delete-orphan")

class TeachingInteraction(Base):
    __tablename__ = "teaching_interactions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("learning_sessions.id", ondelete="CASCADE"))
    section_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("lesson_sections.id", ondelete="SET NULL"), nullable=True)
    
    step_type: Mapped[str] = mapped_column(String(50), nullable=False) # EXPLANATION, QUESTION, RE_EXPLANATION, EVALUATION
    teacher_script: Mapped[str] = mapped_column(Text, nullable=False)
    visual_spec: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    audio_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    student_response: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_correct: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    evaluation_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    session: Mapped["LearningSession"] = relationship(back_populates="interactions")
    section: Mapped[Optional["LessonSection"]] = relationship(back_populates="interactions")

class Misconception(Base):
    __tablename__ = "misconceptions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("learning_sessions.id", ondelete="CASCADE"))
    
    topic: Mapped[str] = mapped_column(String(255), nullable=False)
    misconception_text: Mapped[str] = mapped_column(Text, nullable=False)
    remedy_applied: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.9)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    session: Mapped["LearningSession"] = relationship(back_populates="misconceptions")
