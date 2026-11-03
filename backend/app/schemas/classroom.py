import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class LiveSessionCreate(BaseModel):
    course_id: uuid.UUID
    topic: str


class LiveMessageCreate(BaseModel):
    body: str


class LivePollCreate(BaseModel):
    question: str
    options: list[str]


class LivePollVote(BaseModel):
    option_index: int


class LiveMessageResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    user_id: uuid.UUID
    author_name: str
    body: str
    created_at: datetime


class AttendanceRow(BaseModel):
    student_id: uuid.UUID
    student_name: str
    method: str
    marked_at: datetime


class LiveSessionResponse(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    course_title: Optional[str] = None
    course_code: Optional[str] = None
    lecturer_id: uuid.UUID
    topic: str
    status: str
    poll: Optional[dict[str, Any]] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    present_count: int = 0
    enrolled_count: int = 0
    checked_in: bool = False


class ReportCreate(BaseModel):
    course_id: uuid.UUID


class TeachingReportResponse(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    lecturer_id: uuid.UUID
    title: str
    summary: str
    payload: dict[str, Any]
    created_at: datetime
