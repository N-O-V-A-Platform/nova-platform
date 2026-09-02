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
    inst_result = await db.execute(select(Institution).where(Institution.code == "NOVA-ACAD"))
    institution = inst_result.scalars().first()
    if not institution:
        institution = Institution(
            name="N.O.V.A Academy of AI",
            code="NOVA-ACAD",
            email="info@nova.edu",
            country="India",
            is_active=True
        )
        db.add(institution)
        await db.commit()
        await db.refresh(institution)

    # 3. Seed default Department
    dept_result = await db.execute(select(Department).where(Department.code == "CS-AI"))
    department = dept_result.scalars().first()
    if not department:
        department = Department(
            institution_id=institution.id,
            name="Computer Science & AI Engineering",
            code="CS-AI"
        )
        db.add(department)
        await db.commit()
        await db.refresh(department)

    # 4. Seed default Lecturer
    lect_result = await db.execute(select(User).where(User.email == "lecturer@nova.edu"))
    lecturer = lect_result.scalars().first()
    if not lecturer:
        lecturer = User(
            email="lecturer@nova.edu",
            first_name="AI",
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

    # 5. Seed 10 CS & AI courses
    from app.api.uipath import UIPATH_COURSES
    for c in UIPATH_COURSES:
        course_id = uuid.UUID(c["id"])
        course_result = await db.execute(select(Course).where(Course.id == course_id))
        course = course_result.scalars().first()
        if not course:
            course = Course(
                id=course_id,
                department_id=department.id,
                lecturer_id=lecturer.id,
                title=c["title"],
                code=c["code"],
                semester=1 if c["difficulty"] == "Beginner" else 2 if c["difficulty"] == "Intermediate" else 3,
                credits=3 if c["difficulty"] == "Beginner" else 4
            )
            db.add(course)
        else:
            # Update existing title and code in database
            course.title = c["title"]
            course.code = c["code"]
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
                    "CS-AI-1": ("AI_Starter_Introduction_Guide.pdf", "/resources/docs/ai-starter"),
                    "CS-ML-2": ("Machine_Learning_Beginners_Guide.pdf", "/resources/docs/ml-guide"),
                    "CS-ALG-3": ("Algorithms_Control_Flow_Guide.pdf", "/resources/docs/algorithms"),
                    "CS-DAT-4": ("Data_Structures_Database_Systems.pdf", "/resources/docs/databases"),
                    "CS-PY-5": ("Python_Programming_Analytics_Guide.pdf", "/resources/docs/python"),
                    "CS-WEB-6": ("Web_Development_Frontend_Guide.pdf", "/resources/docs/web-dev"),
                    "CS-NLP-7": ("Natural_Language_Processing_LLMs.pdf", "/resources/docs/nlp-llms"),
                    "CS-CV-8": ("Computer_Vision_Visual_Intelligence.pdf", "/resources/docs/computer-vision"),
                    "CS-SYS-9": ("Software_Architecture_System_Design.pdf", "/resources/docs/system-design"),
                    "CS-ERR-10": ("Debugging_Exception_Handling_Guide.pdf", "/resources/docs/debugging"),
                }
                file_info = url_map.get(c["code"], ("Course_Documentation.pdf", "/resources/docs"))
                new_resource = Resource(
                    course_id=course.id,
                    file_name=file_info[0],
                    file_type="pdf",
                    storage_url=file_info[1],
                    uploaded_by=lecturer.id
                )
                db.add(new_resource)
                
    await db.commit()
