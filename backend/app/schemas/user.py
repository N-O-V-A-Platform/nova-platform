import uuid
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, Field

class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    status: str = "Active"

class UserCreate(UserBase):
    password: str
    role_name: Optional[Literal["Student", "Lecturer"]] = "Student"
    institution_code: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: uuid.UUID
    role_name: Optional[str] = None
    institution_id: Optional[uuid.UUID] = None
    is_email_verified: bool = False
    is_onboarded: bool = False
    reminders_enabled: bool = True

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., min_length=1)

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    institution_id: Optional[uuid.UUID] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class GoogleAuthRequest(BaseModel):
    id_token: str = Field(..., min_length=1)

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6)

class OnboardingRequest(BaseModel):
    role_name: Literal["Student", "Lecturer"]
    institution_code: Optional[str] = None

