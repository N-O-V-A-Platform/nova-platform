from app.models.ai import AIConversation, Escalation, Question
from app.models.analytics import AuditLog
from app.models.course import Course, Enrollment
from app.models.institution import Department, Institution
from app.models.lecture import Lecture
from app.models.notification import Notification
from app.models.quiz import Quiz, QuizAttempt
from app.models.resource import KnowledgeBase, Resource
from app.models.skills import Badge, Certificate, Portfolio, SkillPassport
from app.models.user import Permission, Role, User, RevokedToken
from app.models.workflow import Workflow

__all__ = [
    "AIConversation",
    "AuditLog",
    "Badge",
    "Certificate",
    "Course",
    "Department",
    "Enrollment",
    "Escalation",
    "Institution",
    "KnowledgeBase",
    "Lecture",
    "Notification",
    "Permission",
    "Portfolio",
    "Question",
    "Quiz",
    "QuizAttempt",
    "Resource",
    "RevokedToken",
    "Role",
    "SkillPassport",
    "User",
    "Workflow",
]