import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class QuizBase(BaseModel):
    title: str
    generated_by_ai: bool = False

class QuizCreate(QuizBase):
    course_id: uuid.UUID

class QuizResponse(QuizBase):
    id: uuid.UUID
    course_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True

class QuizAttemptCreate(BaseModel):
    quiz_id: uuid.UUID
    score: float

class QuizAttemptResponse(BaseModel):
    id: uuid.UUID
    quiz_id: uuid.UUID
    student_id: uuid.UUID
    score: float
    submitted_at: datetime

    class Config:
        from_attributes = True
