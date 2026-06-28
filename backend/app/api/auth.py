from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
import httpx

from app.db.session import get_db
from app.models.user import User, Role
from app.models.institution import Institution
from app.schemas.user import UserCreate, UserLogin, Token, UserResponse, GoogleAuthRequest
from app.auth.security import verify_password, get_password_hash, create_access_token, create_refresh_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalars().first():
        raise HTTPException(
            status_code=400,
            detail="A user with this email address already exists.",
        )
    
    # Get or create role
    role_result = await db.execute(select(Role).where(Role.name == user_in.role_name))
    role = role_result.scalars().first()
    if not role:
        role = Role(name=user_in.role_name)
        db.add(role)
        await db.commit()
        await db.refresh(role)
    
    # Get institution by code
    institution = None
    if user_in.institution_code:
        inst_result = await db.execute(
            select(Institution).where(Institution.code == user_in.institution_code)
        )
        institution = inst_result.scalars().first()

    # Create user
    hashed_password = get_password_hash(user_in.password)
    user = User(
        email=user_in.email,
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        password_hash=hashed_password,
        role=role,
        institution=institution,
        status="Active"
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Generate tokens
    access_token = create_access_token(
        subject=user.email,
        role=role.name,
        institution_id=user.institution_id,
        first_name=user.first_name,
        last_name=user.last_name
    )
    refresh_token = create_refresh_token(subject=user.email)

    # Prepare response
    user_response = UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role_name=role.name,
        institution_id=user.institution_id,
        status=user.status
    )

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_response
    )

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    # Fetch user
    result = await db.execute(
        select(User)
        .where(User.email == credentials.email)
        .options(selectinload(User.role))
    )
    user = result.scalars().first()
    
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    
    if not user.is_active or user.status == "Inactive":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )

    role_name = user.role.name if user.role else "Student"

    # Generate tokens
    access_token = create_access_token(
        subject=user.email,
        role=role_name,
        institution_id=user.institution_id,
        first_name=user.first_name,
        last_name=user.last_name
    )
    refresh_token = create_refresh_token(subject=user.email)

    user_response = UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role_name=role_name,
        institution_id=user.institution_id,
        status=user.status
    )

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_response
    )

@router.post("/google", response_model=Token)
async def google_auth(payload: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    # Call Google API to verify id_token
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": payload.credential},
            timeout=10
        )
    
    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Google credential"
        )
    
    id_info = response.json()
    email = id_info.get("email")
    first_name = id_info.get("given_name", "")
    last_name = id_info.get("family_name", "")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not provided by Google"
        )

    # Get or create user
    result = await db.execute(
        select(User)
        .where(User.email == email)
        .options(selectinload(User.role))
    )
    user = result.scalars().first()

    if not user:
        # Default role Student
        role_result = await db.execute(select(Role).where(Role.name == "Student"))
        role = role_result.scalars().first()
        if not role:
            role = Role(name="Student")
            db.add(role)
            await db.commit()
            await db.refresh(role)

        # Attempt to auto-link institution
        domain = email.split("@")[-1]
        inst_code = domain.split(".")[0]
        inst_result = await db.execute(select(Institution).where(Institution.code == inst_code))
        institution = inst_result.scalars().first()

        user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            password_hash=get_password_hash(uuid.uuid4().hex),  # Random password
            role=role,
            institution=institution,
            status="Active"
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    
    role_name = user.role.name if user.role else "Student"

    # Generate tokens
    access_token = create_access_token(
        subject=user.email,
        role=role_name,
        institution_id=user.institution_id,
        first_name=user.first_name,
        last_name=user.last_name
    )
    refresh_token = create_refresh_token(subject=user.email)

    user_response = UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role_name=role_name,
        institution_id=user.institution_id,
        status=user.status
    )

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_response
    )
