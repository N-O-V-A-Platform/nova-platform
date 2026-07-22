import os
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.user import User, Role
from app.models.institution import Institution, Department
from app.models.course import Course
from app.auth.security import get_password_hash

async def init_db(db: AsyncSession) -> None:
    """
    Seed initial database data like roles, default institution, department, lecturer, and UiPath courses.
    """
    # 1. Seed Roles
    roles = ["Admin", "Lecturer", "Student"]
    role_map = {}
    for role_name in roles:
        result = await db.execute(select(Role).where(Role.name == role_name))
        role = result.scalars().first()
        if not role:
            role = Role(name=role_name)
            db.add(role)
            await db.commit()
            await db.refresh(role)
        role_map[role_name] = role

    # 2. Seed default Institution
    inst_result = await db.execute(select(Institution).where(Institution.code == "UIPATH-ACAD"))
    institution = inst_result.scalars().first()
    if not institution:
        institution = Institution(
            name="UiPath Academy",
            code="UIPATH-ACAD",
            email="info@academy.uipath.com",
            country="India",
            is_active=True
        )
        db.add(institution)
        await db.commit()
        await db.refresh(institution)

    # 3. Seed default Department
    dept_result = await db.execute(select(Department).where(Department.code == "RPA-IA"))
    department = dept_result.scalars().first()
    if not department:
        department = Department(
            institution_id=institution.id,
            name="RPA & Intelligent Automation",
            code="RPA-IA"
        )
        db.add(department)
        await db.commit()
        await db.refresh(department)

    # 4. Seed default Lecturer
    lect_result = await db.execute(select(User).where(User.email == "uipath.lecturer@nova.edu"))
    lecturer = lect_result.scalars().first()
    if not lecturer:
        lecturer = User(
            email="uipath.lecturer@nova.edu",
            first_name="UiPath",
            last_name="Instructor",
            password_hash=get_password_hash(os.getenv("SEED_LECTURER_PASSWORD", uuid.uuid4().hex)),
            role_id=role_map["Lecturer"].id,
            institution_id=institution.id,
            is_active=True,
            status="Active"
        )
        db.add(lecturer)
        await db.commit()
        await db.refresh(lecturer)

    # 5. Seed 10 UiPath courses
    # Import the updated courses with their direct UUID mappings
    from app.api.uipath import UIPATH_COURSES
    for c in UIPATH_COURSES:
        course_result = await db.execute(select(Course).where(Course.code == c["code"]))
        course = course_result.scalars().first()
        if not course:
            course = Course(
                id=uuid.UUID(c["id"]),
                department_id=department.id,
                lecturer_id=lecturer.id,
                title=c["title"],
                code=c["code"],
                semester=1 if c["difficulty"] == "Beginner" else 2 if c["difficulty"] == "Intermediate" else 3,
                credits=3 if c["difficulty"] == "Beginner" else 4
            )
            db.add(course)
            
    await db.commit()
