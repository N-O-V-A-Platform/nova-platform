import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class QuizQuestionIn(BaseModel):
    prompt: str
    options: list[str] = Field(min_length=2)
    correct_index: int = 0
    explanation: str = ""


class QuizCreate(BaseModel):
    course_id: uuid.UUID
    title: str
    topic: Optional[str] = None
    questions: list[QuizQuestionIn]
    generated_by_ai: bool = False
    is_published: bool = False


class QuizGenerateRequest(BaseModel):
    course_id: uuid.UUID
    topic: str
    count: int = 5
    publish: bool = True


class QuizQuestionPublic(BaseModel):
    id: str
    prompt: str
    options: list[str]
    correct_index: Optional[int] = None
    explanation: Optional[str] = None


class QuizAttemptPublic(BaseModel):
    id: uuid.UUID
    score: float
    answers: list[Any] = []
    submitted_at: datetime


class QuizResponse(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    title: str
    topic: Optional[str] = None
    generated_by_ai: bool
    is_published: bool
    created_at: datetime
    question_count: int = 0
    questions: list[QuizQuestionPublic] = []
    my_attempt: Optional[QuizAttemptPublic] = None
    attempt_count: Optional[int] = None
    average_score: Optional[float] = None

    class Config:
        from_attributes = True


class QuizSubmitRequest(BaseModel):
    answers: dict[str, int]


class QuizResultRow(BaseModel):
    student_id: uuid.UUID
    student_name: str
    score: float
    submitted_at: datetime
