import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class QuestionCreate(BaseModel):
    question: str

class QuestionResponse(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    question: str
    response: Optional[str] = None
    confidence_score: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AIConversationCreate(BaseModel):
    course_id: uuid.UUID
    title: Optional[str] = None

class AIConversationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    course_id: uuid.UUID
    title: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AIConversationDetailResponse(AIConversationResponse):
    questions: List[QuestionResponse] = []

    class Config:
        from_attributes = True

class EscalationResponse(BaseModel):
    id: uuid.UUID
    question_id: uuid.UUID
    lecturer_id: uuid.UUID
    status: str
    escalated_at: datetime

    class Config:
        from_attributes = True

class EscalationDetailResponse(EscalationResponse):
    question: QuestionResponse

    class Config:
        from_attributes = True
