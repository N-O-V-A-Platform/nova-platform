import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class CourseBase(BaseModel):
    title: str
    code: str
    semester: int
    credits: int

class CourseCreate(CourseBase):
    department_id: uuid.UUID

class CourseResponse(CourseBase):
    id: uuid.UUID
    department_id: uuid.UUID
    lecturer_id: uuid.UUID

    class Config:
        from_attributes = True

class EnrollmentCreate(BaseModel):
    course_id: uuid.UUID

class EnrollmentResponse(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    course_id: uuid.UUID
    enrolled_at: datetime

    class Config:
        from_attributes = True
