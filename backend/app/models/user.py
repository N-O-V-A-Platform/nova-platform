import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class Role(Base):
    __tablename__ = "roles"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    permissions: Mapped[List["Permission"]] = relationship(back_populates="role", cascade="all, delete-orphan")
    users: Mapped[List["User"]] = relationship(back_populates="role")

class Permission(Base):
    __tablename__ = "permissions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    role_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("roles.id", ondelete="CASCADE"))
    permission_name: Mapped[str] = mapped_column(String(150), nullable=False)

    # Relationships
    role: Mapped[Role] = relationship(back_populates="permissions")

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    institution_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True)
    role_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("roles.id", ondelete="SET NULL"), nullable=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="Active")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_onboarded: Mapped[bool] = mapped_column(Boolean, default=False)
    reminders_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    institution: Mapped[Optional["Institution"]] = relationship(back_populates="users")
    role: Mapped[Optional[Role]] = relationship(back_populates="users")
    taught_courses: Mapped[List["Course"]] = relationship(back_populates="lecturer")
    enrollments: Mapped[List["Enrollment"]] = relationship(back_populates="student")
    ai_conversations: Mapped[List["AIConversation"]] = relationship(back_populates="user")
    escalations: Mapped[List["Escalation"]] = relationship(back_populates="lecturer")
    quiz_attempts: Mapped[List["QuizAttempt"]] = relationship(back_populates="student")
    certificates: Mapped[List["Certificate"]] = relationship(back_populates="user")
    badges: Mapped[List["Badge"]] = relationship(back_populates="user")
    skill_passport: Mapped[Optional["SkillPassport"]] = relationship(back_populates="user", uselist=False)
    portfolio: Mapped[Optional["Portfolio"]] = relationship(back_populates="user", uselist=False)
    notifications: Mapped[List["Notification"]] = relationship(back_populates="user")
    audit_logs: Mapped[List["AuditLog"]] = relationship(back_populates="user")

class RevokedToken(Base):
    __tablename__ = "revoked_tokens"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    jti: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

