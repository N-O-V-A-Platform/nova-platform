from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
import uuid
import os

from app.db.session import get_db
from app.models.resource import Resource, KnowledgeBase
from app.models.course import Course
from app.models.user import User
from app.schemas.resource import ResourceCreate, ResourceResponse
from app.auth.dependencies import get_current_user, RoleChecker
from app.ai.document_processor import DocumentProcessor
from app.ai.embeddings import EmbeddingService
from app.ai.vector_store import PineconeVectorStore
from app.core.config import settings

router = APIRouter(prefix="/resources", tags=["Resources"])

@router.post("/", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
async def create_resource(
    resource_in: ResourceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Lecturer", "Admin"]))
):
    # Check if course exists
    course_result = await db.execute(select(Course).where(Course.id == resource_in.course_id))
    course = course_result.scalars().first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    resource = Resource(
        course_id=resource_in.course_id,
        lecture_id=resource_in.lecture_id,
        file_name=resource_in.file_name,
        file_type=resource_in.file_type,
        storage_url=resource_in.storage_url,
        uploaded_by=current_user.id
    )
    db.add(resource)
    await db.commit()
    await db.refresh(resource)
    return resource

@router.post("/upload", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
async def upload_resource(
    course_id: uuid.UUID = Form(...),
    lecture_id: Optional[uuid.UUID] = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Lecturer", "Admin"]))
):
    # Check if course exists
    course_result = await db.execute(select(Course).where(Course.id == course_id))
    course = course_result.scalars().first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Read file content
    content = await file.read()
    file_name = file.filename
    file_ext = os.path.splitext(file_name)[1].lower() if file_name else ".txt"

    # Ensure uploads directory exists
    upload_dir = "static/uploads"
    os.makedirs(upload_dir, exist_ok=True)

    # Save file locally with a unique name to prevent collisions
    unique_filename = f"{uuid.uuid4().hex}_{file_name}"
    file_path = os.path.join(upload_dir, unique_filename)
    with open(file_path, "wb") as buffer:
        buffer.write(content)

    # We store a relative URL so it's host-agnostic
    storage_url = f"/static/uploads/{unique_filename}"

    # Extract text and chunk
    try:
        pages = DocumentProcessor.extract_text(content, file_ext)
        chunks = DocumentProcessor.chunk_text(pages)
    except Exception as e:
        # Cleanup saved file on processing failure
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to process document content: {str(e)}"
        )

    if not chunks:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document contains no extractable text chunks."
        )

    # Create resource in DB first to get an ID
    resource = Resource(
        course_id=course_id,
        lecture_id=lecture_id,
        file_name=file_name,
        file_type=file_ext.strip("."),
        storage_url=storage_url,
        uploaded_by=current_user.id
    )
    db.add(resource)
    await db.commit()
    await db.refresh(resource)

    # Generate embeddings and index in Pinecone
    try:
        embedding_service = EmbeddingService()
        vector_store = PineconeVectorStore()

        if not vector_store.pc:
            raise ValueError("Pinecone vector store is not initialized or configured.")

        # Batch get embeddings
        texts = [chunk["text"] for chunk in chunks]
        embeddings = await embedding_service.get_embeddings_batch(texts)

        # Namespace pattern: course_{course_id}
        namespace = f"course_{course_id}"
        
        # Upsert
        success = await vector_store.upsert_chunks(
            resource_id=str(resource.id),
            course_id=str(course_id),
            chunks=chunks,
            embeddings=embeddings,
            namespace=namespace
        )

        if not success:
            raise ValueError("Failed to index chunks in Pinecone.")

        # Create KnowledgeBase record
        kb_index = KnowledgeBase(
            resource_id=resource.id,
            pinecone_namespace=namespace,
            embedding_model=settings.EMBEDDING_MODEL,
            embedding_dimension=settings.EMBEDDING_DIMENSION
        )
        db.add(kb_index)
        await db.commit()

    except Exception as e:
        # Rollback resource creation and cleanup file
        await db.delete(resource)
        await db.commit()
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to index document in vector database: {str(e)}"
        )

    return resource

@router.get("/course/{course_id}", response_model=List[ResourceResponse])
async def list_course_resources(
    course_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Resource).where(Resource.course_id == course_id)
    )
    return result.scalars().all()
