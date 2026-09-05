import uuid
from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, field_validator

class CreateSessionRequest(BaseModel):
    title: str = Field(..., example="Class 10 Physics — Electricity & Ohm's Law")
    student_level: str = Field("Class 10", example="Class 10")
    language: str = Field("Hinglish", example="Hinglish")
    available_time_mins: int = Field(20, example=20)
    learning_goal: str = Field(..., example="Understand Ohm's Law and solve basic circuit problems")
    course_id: Optional[uuid.UUID] = None

class SectionResponse(BaseModel):
    id: uuid.UUID
    section_order: int
    title: str
    duration_mins: int
    key_concepts: Optional[List[str]] = None
    status: str

    @field_validator("key_concepts", mode="before")
    @classmethod
    def unwrap_key_concepts(cls, value: Any) -> Any:
        """Expose the persisted concept wrapper as the list promised by the API."""
        if isinstance(value, dict):
            return value.get("concepts", [])
        return value

    class Config:
        from_attributes = True

class LessonPlanResponse(BaseModel):
    id: uuid.UUID
    overview: str
    total_sections: int
    sections: List[SectionResponse]

    class Config:
        from_attributes = True

class MisconceptionResponse(BaseModel):
    id: uuid.UUID
    topic: str
    misconception_text: str
    remedy_applied: Optional[str] = None
    confidence: float
    resolved: bool

    class Config:
        from_attributes = True

class SessionDetailResponse(BaseModel):
    id: uuid.UUID
    title: str
    student_level: str
    language: str
    available_time_mins: int
    learning_goal: str
    status: str
    current_section_index: int
    current_step_type: str
    created_at: datetime
    lesson_plan: Optional[LessonPlanResponse] = None
    misconceptions: List[MisconceptionResponse] = []

    class Config:
        from_attributes = True

class StepInteractionResponse(BaseModel):
    session_id: uuid.UUID
    section_id: Optional[uuid.UUID] = None
    section_title: str
    section_index: int
    total_sections: int
    step_type: str
    teacher_script: str
    visual_spec: Optional[Dict[str, Any]] = None
    audio_data_url: Optional[str] = None
    voice_used: Optional[str] = None
    avatar_config: Dict[str, Any]
    question: Optional[str] = None
    citations: Optional[List[Dict[str, Any]]] = None

class StudentAnswerRequest(BaseModel):
    response_text: str = Field(..., json_schema_extra={"example": "Current badhega jab resistance badhega"})
    voice_preset: Optional[str] = "dr_nova"
    speech_rate: Optional[float] = 1.0

class EvaluationResponse(BaseModel):
    session_id: uuid.UUID
    is_correct: bool
    confidence: float
    misconception_detected: bool
    misconception_title: Optional[str] = None
    misconception_explanation: Optional[str] = None
    remedy_script: str
    simplified_question: Optional[str] = None
    visual_spec: Optional[Dict[str, Any]] = None
    audio_data_url: Optional[str] = None
    voice_used: Optional[str] = None
    avatar_config: Dict[str, Any]
    citations: Optional[List[Dict[str, Any]]] = None
