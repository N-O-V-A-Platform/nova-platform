"""
N.O.V.A. Learner Knowledge Graph Service
Manages concept topologies, prerequisite gating, and student mastery state transitions.
"""

import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.models.knowledge_graph import CourseConcept, ConceptDependency, StudentKnowledgeState
from app.models.user import User


class KnowledgeGraphService:
    @staticmethod
    async def get_or_create_learner_state(
        db: AsyncSession, student_id: uuid.UUID, concept_id: uuid.UUID
    ) -> StudentKnowledgeState:
        """Fetch existing student state or initialize an 'unseen' node."""
        res = await db.execute(
            select(StudentKnowledgeState).where(
                StudentKnowledgeState.student_id == student_id,
                StudentKnowledgeState.concept_id == concept_id,
            )
        )
        state = res.scalars().first()
        if not state:
            state = StudentKnowledgeState(
                student_id=student_id,
                concept_id=concept_id,
                mastery_status="unseen",
                confidence_score=0.0,
                assessments_count=0,
                consecutive_correct=0,
                active_misconceptions=[],
                last_evaluated_at=datetime.utcnow(),
            )
            db.add(state)
            await db.commit()
            await db.refresh(state)
        return state

    @staticmethod
    async def check_prerequisites_met(
        db: AsyncSession, student_id: uuid.UUID, target_concept_id: uuid.UUID
    ) -> tuple[bool, List[Dict[str, Any]]]:
        """
        Validates whether all prerequisite concepts for a target concept
        are mastered or at least at confident practicing level.
        Returns: (all_prereqs_met, list_of_unmet_prerequisites)
        """
        # Fetch all prerequisites for this target concept
        deps_res = await db.execute(
            select(ConceptDependency, CourseConcept)
            .join(CourseConcept, ConceptDependency.prerequisite_id == CourseConcept.id)
            .where(ConceptDependency.target_id == target_concept_id)
        )
        dependencies = deps_res.all()
        if not dependencies:
            return True, []

        unmet = []
        for dep, prereq_concept in dependencies:
            state = await KnowledgeGraphService.get_or_create_learner_state(
                db, student_id, prereq_concept.id
            )
            # Threshold: Confidence must be >= 0.70 and not needs_revision
            if state.confidence_score < 0.70 or state.mastery_status in ["unseen", "needs_revision"]:
                unmet.append({
                    "concept_id": str(prereq_concept.id),
                    "name": prereq_concept.name,
                    "slug": prereq_concept.slug,
                    "current_status": state.mastery_status,
                    "confidence_score": state.confidence_score,
                    "required_confidence": 0.70,
                })

        return len(unmet) == 0, unmet

    @staticmethod
    async def record_evaluation_outcome(
        db: AsyncSession,
        student_id: uuid.UUID,
        concept_id: uuid.UUID,
        is_correct: bool,
        misconception_text: Optional[str] = None,
    ) -> StudentKnowledgeState:
        """
        Updates student mastery lifecycle, confidence score, and misconception tracking
        following a formative assessment or Socratic evaluation step.
        """
        state = await KnowledgeGraphService.get_or_create_learner_state(db, student_id, concept_id)
        state.assessments_count += 1
        state.last_evaluated_at = datetime.utcnow()

        if is_correct:
            state.consecutive_correct += 1
            # Confidence reward ramp
            state.confidence_score = min(1.0, round(state.confidence_score + 0.15, 2))
            
            # Transition lifecycle
            if state.consecutive_correct >= 3 and state.confidence_score >= 0.85:
                state.mastery_status = "mastered"
            elif state.confidence_score >= 0.50:
                state.mastery_status = "practicing"
            else:
                state.mastery_status = "introduced"

            # Resolve any matching active misconception
            if misconception_text and state.active_misconceptions:
                state.active_misconceptions = [
                    m for m in state.active_misconceptions
                    if m.get("text") != misconception_text
                ]
        else:
            state.consecutive_correct = 0
            # Confidence penalty
            state.confidence_score = max(0.0, round(state.confidence_score - 0.20, 2))
            
            if state.confidence_score < 0.40:
                state.mastery_status = "needs_revision"
            else:
                state.mastery_status = "practicing"

            # Append active misconception if provided
            if misconception_text:
                current_misconceptions = list(state.active_misconceptions or [])
                current_misconceptions.append({
                    "text": misconception_text,
                    "timestamp": datetime.utcnow().isoformat(),
                })
                state.active_misconceptions = current_misconceptions

        await db.commit()
        await db.refresh(state)
        return state

    @staticmethod
    async def get_course_knowledge_graph(
        db: AsyncSession, student_id: uuid.UUID, course_id: uuid.UUID
    ) -> Dict[str, Any]:
        """Returns the full topological graph with the student's mastery overlay."""
        # 1. Fetch concepts
        c_res = await db.execute(
            select(CourseConcept).where(CourseConcept.course_id == course_id)
        )
        concepts = c_res.scalars().all()

        concept_ids = [c.id for c in concepts]
        if not concept_ids:
            return {
                "course_id": course_id,
                "total_concepts": 0,
                "mastered_count": 0,
                "practicing_count": 0,
                "needs_revision_count": 0,
                "overall_mastery_percentage": 0.0,
                "concepts": [],
                "dependencies": [],
            }

        # 2. Fetch dependencies
        d_res = await db.execute(
            select(ConceptDependency, CourseConcept.name)
            .join(CourseConcept, ConceptDependency.prerequisite_id == CourseConcept.id)
            .where(ConceptDependency.target_id.in_(concept_ids))
        )
        dep_rows = d_res.all()

        dependencies_output = []
        for dep, prereq_name in dep_rows:
            dependencies_output.append({
                "id": dep.id,
                "prerequisite_id": dep.prerequisite_id,
                "target_id": dep.target_id,
                "weight": dep.weight,
                "prerequisite_name": prereq_name,
            })

        # 3. Fetch learner states
        s_res = await db.execute(
            select(StudentKnowledgeState).where(
                StudentKnowledgeState.student_id == student_id,
                StudentKnowledgeState.concept_id.in_(concept_ids),
            )
        )
        states_map = {s.concept_id: s for s in s_res.scalars().all()}

        concepts_output = []
        mastered = 0
        practicing = 0
        needs_revision = 0

        for c in concepts:
            st = states_map.get(c.id)
            status = st.mastery_status if st else "unseen"
            confidence = st.confidence_score if st else 0.0
            
            if status == "mastered":
                mastered += 1
            elif status == "practicing":
                practicing += 1
            elif status == "needs_revision":
                needs_revision += 1

            concepts_output.append({
                "id": st.id if st else uuid.uuid4(),
                "student_id": student_id,
                "concept_id": c.id,
                "concept_name": c.name,
                "concept_slug": c.slug,
                "difficulty_tier": c.difficulty_tier,
                "mastery_status": status,
                "confidence_score": confidence,
                "assessments_count": st.assessments_count if st else 0,
                "consecutive_correct": st.consecutive_correct if st else 0,
                "active_misconceptions": st.active_misconceptions if st else [],
                "last_evaluated_at": st.last_evaluated_at if st else datetime.utcnow(),
            })

        total = len(concepts)
        mastery_pct = round((mastered / total) * 100, 1) if total > 0 else 0.0

        return {
            "course_id": course_id,
            "total_concepts": total,
            "mastered_count": mastered,
            "practicing_count": practicing,
            "needs_revision_count": needs_revision,
            "overall_mastery_percentage": mastery_pct,
            "concepts": concepts_output,
            "dependencies": dependencies_output,
        }
