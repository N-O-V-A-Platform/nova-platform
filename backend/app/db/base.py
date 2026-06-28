from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    """
    Base class for all SQLAlchemy database models.
    """
    pass

# Import all models here so that they are registered on the Base metadata
# when Alembic imports app.db.base.Base
from app.models.institution import Institution, Department
from app.models.user import User, Role, Permission
from app.models.course import Course, Enrollment
from app.models.lecture import Lecture
from app.models.resource import Resource, KnowledgeBase
from app.models.ai import AIConversation, Question, Escalation
from app.models.quiz import Quiz, QuizAttempt
from app.models.skills import Certificate, Badge, SkillPassport, Portfolio
from app.models.workflow import Workflow
from app.models.notification import Notification
from app.models.analytics import AuditLog
