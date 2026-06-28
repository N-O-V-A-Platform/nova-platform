import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class ResourceBase(BaseModel):
    file_name: str
    file_type: str
    storage_url: str

class ResourceCreate(ResourceBase):
    course_id: uuid.UUID
    lecture_id: Optional[uuid.UUID] = None

class ResourceResponse(ResourceBase):
    id: uuid.UUID
    course_id: uuid.UUID
    lecture_id: Optional[uuid.UUID] = None
    uploaded_by: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True
