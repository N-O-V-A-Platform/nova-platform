import uuid
from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field

# Concept Node Schemas
class ConceptCreate(BaseModel):
    name: str = Field(..., example="Decision Trees")
    slug: str = Field(..., example="decision-trees")
    description: Optional[str] = Field(None, example="Supervised classification and regression tree models based on entropy splits.")
    difficulty_tier: int = Field(1, ge=1, le=5, example=2)
    syllabus_week: Optional[int] = Field(None, example=4)

class ConceptResponse(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    name: str
    slug: str
    description: Optional[str] = None
    difficulty_tier: int
    syllabus_week: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Dependency / Prerequisite Edge Schemas
class DependencyCreate(BaseModel):
    prerequisite_id: uuid.UUID
    target_id: uuid.UUID
    weight: float = Field(1.0, ge=0.0, le=1.0)

class DependencyResponse(BaseModel):
    id: uuid.UUID
    prerequisite_id: uuid.UUID
    target_id: uuid.UUID
    weight: float
    prerequisite_name: Optional[str] = None
    target_name: Optional[str] = None

# Learner Knowledge State Schemas
class StudentKnowledgeStateResponse(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    concept_id: uuid.UUID
    concept_name: str
    concept_slug: str
    difficulty_tier: int
    mastery_status: str # unseen, introduced, practicing, mastered, needs_revision
    confidence_score: float # 0.0 to 1.0
    assessments_count: int
    consecutive_correct: int
    active_misconceptions: Optional[List[Dict[str, Any]]] = []
    last_evaluated_at: datetime

    class Config:
        from_attributes = True

class KnowledgeGraphViewResponse(BaseModel):
    course_id: uuid.UUID
    total_concepts: int
    mastered_count: int
    practicing_count: int
    needs_revision_count: int
    overall_mastery_percentage: float
    concepts: List[StudentKnowledgeStateResponse]
    dependencies: List[DependencyResponse]
