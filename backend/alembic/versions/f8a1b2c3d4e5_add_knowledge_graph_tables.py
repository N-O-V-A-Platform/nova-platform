"""add knowledge graph and learner state tables

Revision ID: f8a1b2c3d4e5
Revises: d4e5f6a7b8c9
Create Date: 2026-11-14
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f8a1b2c3d4e5"
down_revision: Union[str, Sequence[str], None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Course Concepts (Nodes in Knowledge Graph)
    op.create_table(
        "course_concepts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("course_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("difficulty_tier", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("syllabus_week", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # 2. Concept Dependencies (Directed Prerequisite Edges)
    op.create_table(
        "concept_dependencies",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("prerequisite_id", sa.Uuid(), nullable=False),
        sa.Column("target_id", sa.Uuid(), nullable=False),
        sa.Column("weight", sa.Float(), nullable=False, server_default="1.0"),
        sa.ForeignKeyConstraint(["prerequisite_id"], ["course_concepts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["target_id"], ["course_concepts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("prerequisite_id", "target_id", name="uq_prerequisite_target"),
    )

    # 3. Student Knowledge States (Learner Mastery Overlay)
    op.create_table(
        "student_knowledge_states",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("student_id", sa.Uuid(), nullable=False),
        sa.Column("concept_id", sa.Uuid(), nullable=False),
        sa.Column("mastery_status", sa.String(length=50), nullable=False, server_default="unseen"),
        sa.Column("confidence_score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("assessments_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("consecutive_correct", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("active_misconceptions", sa.JSON(), nullable=True),
        sa.Column("last_evaluated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["concept_id"], ["course_concepts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("student_id", "concept_id", name="uq_student_concept_state"),
    )


def downgrade() -> None:
    op.drop_table("student_knowledge_states")
    op.drop_table("concept_dependencies")
    op.drop_table("course_concepts")
