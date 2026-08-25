import pytest
import uuid
import io
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import ASGITransport, AsyncClient
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.main import app
from app.core.config import settings
from app.db.session import get_db
from app.models.course import Course
from app.models.user import User, Role
from app.models.resource import Resource, KnowledgeBase
from app.auth.security import create_access_token



@pytest.fixture
async def setup_lecturer_and_course(db_session):
    # Ensure Lecturer role exists
    role_result = await db_session.execute(select(Role).where(Role.name == "Lecturer"))
    role = role_result.scalars().first()
    if not role:
        role = Role(name="Lecturer")
        db_session.add(role)
        await db_session.commit()
        await db_session.refresh(role)

    # Fetch or create Institution & Department
    from app.models.institution import Institution, Department
    inst_result = await db_session.execute(select(Institution).limit(1))
    institution = inst_result.scalars().first()
    if not institution:
        institution = Institution(
            name="Test Institution",
            code=f"TEST-INST-{uuid.uuid4().hex[:4].upper()}",
            email="test@inst.com",
            country="India",
            is_active=True
        )
        db_session.add(institution)
        await db_session.commit()
        await db_session.refresh(institution)

    dept_result = await db_session.execute(select(Department).limit(1))
    department = dept_result.scalars().first()
    if not department:
        department = Department(
            institution_id=institution.id,
            name="Test Department",
            code=f"TEST-DEPT-{uuid.uuid4().hex[:4].upper()}"
        )
        db_session.add(department)
        await db_session.commit()
        await db_session.refresh(department)

    # Create a unique lecturer user
    email = f"lecturer_{uuid.uuid4().hex[:8]}@example.com"
    lecturer = User(
        email=email,
        password_hash="fakehash",
        first_name="Jane",
        last_name="Doe",
        is_active=True,
        is_email_verified=True,
        is_onboarded=True,
        status="Active",
        role_id=role.id,
        institution_id=institution.id
    )
    db_session.add(lecturer)
    await db_session.commit()
    await db_session.refresh(lecturer)

    # Create a unique course
    course_code = f"TEST-{uuid.uuid4().hex[:4].upper()}"
    course = Course(
        department_id=department.id,
        lecturer_id=lecturer.id,
        code=course_code,
        title="Test Resource Automation Course",
        semester=1,
        credits=3
    )
    db_session.add(course)
    await db_session.commit()
    await db_session.refresh(course)

    # Generate token
    token = create_access_token(
        subject=lecturer.email,
        role="Lecturer",
        first_name=lecturer.first_name,
        last_name=lecturer.last_name
    )

    yield {
        "lecturer": lecturer,
        "course": course,
        "token": token
    }

    # Cleanup
    await db_session.delete(course)
    await db_session.delete(lecturer)
    await db_session.commit()

@pytest.mark.anyio
@patch("app.ai.embeddings.EmbeddingService.get_embeddings_batch", new_callable=AsyncMock)
@patch("app.ai.vector_store.PineconeVectorStore.upsert_chunks", new_callable=AsyncMock)
@patch("app.ai.vector_store.PineconeVectorStore._get_index")
async def test_resource_upload_and_list(
    mock_get_index,
    mock_upsert_chunks,
    mock_get_embeddings_batch,
    setup_lecturer_and_course,
    db_session
):
    # Setup mocks
    mock_get_embeddings_batch.return_value = [[0.1] * 384]
    mock_upsert_chunks.return_value = True
    
    # Mock Pinecone Index and pc client
    mock_index = MagicMock()
    mock_get_index.return_value = mock_index

    # Access setup data
    token = setup_lecturer_and_course["token"]
    course = setup_lecturer_and_course["course"]

    # File mock
    file_content = b"This is a dummy test text content inside a file. It should be long enough to pass basic checks."
    file_name = "test_document.txt"
    files = {"file": (file_name, file_content, "text/plain")}
    data = {"course_id": str(course.id)}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Mock Pinecone client setup in local class instance to avoid connection errors
        with patch("app.ai.vector_store.Pinecone") as mock_pinecone_class:
            mock_pinecone_instance = MagicMock()
            mock_pinecone_class.return_value = mock_pinecone_instance
            
            # Post file upload
            response = await ac.post(
                "/api/v1/resources/upload",
                data=data,
                files=files,
                headers={"Authorization": f"Bearer {token}"}
            )

        assert response.status_code == 201
        res_data = response.json()
        assert res_data["file_name"] == file_name
        assert res_data["file_type"] == "txt"
        assert "storage_url" in res_data
        resource_id = res_data["id"]

        # Verify DB records
        resource_result = await db_session.execute(
            select(Resource).where(Resource.id == uuid.UUID(resource_id))
        )
        resource = resource_result.scalars().first()
        assert resource is not None
        assert resource.file_name == file_name

        # Verify KnowledgeBase index was created
        kb_result = await db_session.execute(
            select(KnowledgeBase).where(KnowledgeBase.resource_id == resource.id)
        )
        kb = kb_result.scalars().first()
        assert kb is not None
        assert kb.pinecone_namespace == f"course_{course.id}"

        # 2. List resources endpoint
        list_response = await ac.get(
            f"/api/v1/resources/course/{course.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert list_response.status_code == 200
        list_data = list_response.json()
        assert len(list_data) >= 1
        assert list_data[0]["id"] == resource_id

        # Clean up database resource manually so setups teardown doesn't hit foreign keys
        await db_session.delete(kb)
        await db_session.delete(resource)
        await db_session.commit()
