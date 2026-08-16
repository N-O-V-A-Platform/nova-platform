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

    # 6. Seed default authentic course resources
    from app.models.resource import Resource
    for c in UIPATH_COURSES:
        course_result = await db.execute(select(Course).where(Course.code == c["code"]))
        course = course_result.scalars().first()
        if course:
            res_result = await db.execute(select(Resource).where(Resource.course_id == course.id))
            if not res_result.scalars().first():
                url_map = {
                    "UI-RPA-1": ("RPA_Starter_Introduction_Guide.pdf", "https://docs.uipath.com/hub/docs/rpa-starter"),
                    "UI-STU-2": ("UiPath_Studio_Beginners_Guide.pdf", "https://docs.uipath.com/studio/standalone/2023.10/user-guide/studio-introduction"),
                    "UI-VAR-3": ("Studio_Variables_and_Arguments.pdf", "https://docs.uipath.com/studio/standalone/2023.10/user-guide/managing-variables"),
                    "UI-DAT-4": ("Studio_Data_Manipulation_Guide.pdf", "https://docs.uipath.com/studio/standalone/2023.10/user-guide/data-manipulation"),
                    "UI-XLS-5": ("Studio_Excel_Automation_Guide.pdf", "https://docs.uipath.com/activities/other/latest/user-guide/excel-activities"),
                    "UI-UIA-6": ("Studio_UI_Automation_Selectors.pdf", "https://docs.uipath.com/activities/other/latest/user-guide/ui-automation-activities"),
                    "UI-EML-7": ("Studio_Mail_Automation_Guide.pdf", "https://docs.uipath.com/activities/other/latest/user-guide/mail-activities"),
                    "UI-PDF-8": ("Studio_PDF_Automation_Guide.pdf", "https://docs.uipath.com/activities/other/latest/user-guide/pdf-activities"),
                    "UI-ORG-9": ("Studio_Project_Organization_Architecture.pdf", "https://docs.uipath.com/studio/standalone/2023.10/user-guide/about-automation-projects"),
                    "UI-ERR-10": ("Studio_Error_Handling_Guide.pdf", "https://docs.uipath.com/studio/standalone/2023.10/user-guide/about-exception-handling"),
                }
                file_info = url_map.get(c["code"], ("UiPath_Course_Documentation.pdf", "https://docs.uipath.com"))
                new_resource = Resource(
                    course_id=course.id,
                    file_name=file_info[0],
                    file_type="pdf",
                    storage_url=file_info[1],
                    uploaded_by=lecturer.id
                )
                db.add(new_resource)
                
    await db.commit()
