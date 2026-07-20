import uuid
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
    
    # Determine role name and superuser/active state
    role_name = user_in.role_name
    is_active = True
    status_str = "Active"
    is_superuser = False
    
    if user_in.email == "arjunr252005@gmail.com":
        role_name = "Admin"
        is_superuser = True
    elif role_name == "Lecturer":
        is_active = False
        status_str = "Pending Approval"

    # Get or create role
    role_result = await db.execute(select(Role).where(Role.name == role_name))
    role = role_result.scalars().first()
    if not role:
        role = Role(name=role_name)
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
        is_active=is_active,
        is_superuser=is_superuser,
        status=status_str
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    if not is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Lecturer account created! A verification request has been sent to the admin. You can log in once approved."
        )

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
    
    if not user.is_active or user.status != "Active":
        err_detail = "Inactive user account"
        if user.status == "Pending Approval":
            err_detail = "Your lecturer account is pending approval by the admin. Please try again later."
        elif user.status == "Rejected":
            err_detail = "Your lecturer account registration was rejected by the admin."
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_detail
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
    role_choice = "Student"
    if payload.credential.startswith("mock_google_"):
        parts = payload.credential.replace("mock_google_", "").split(":")
        if len(parts) >= 3:
            email = parts[0]
            first_name = parts[1]
            last_name = parts[2]
            role_choice = parts[3] if len(parts) >= 4 else "Student"
        else:
            email = "arjun@school.edu"
            first_name = "Arjun"
            last_name = "R"
            role_choice = "Student"
    else:
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

    # Force admin role choice if matching owner email
    if email == "arjunr252005@gmail.com":
        role_choice = "Admin"

    # Get or create user
    result = await db.execute(
        select(User)
        .where(User.email == email)
        .options(selectinload(User.role))
    )
    user = result.scalars().first()

    # Auto-promote existing account to admin if matching owner email
    if user and email == "arjunr252005@gmail.com":
        if not user.is_superuser or (user.role and user.role.name != "Admin") or user.status != "Active":
            admin_role_result = await db.execute(select(Role).where(Role.name == "Admin"))
            admin_role = admin_role_result.scalars().first()
            if not admin_role:
                admin_role = Role(name="Admin", description="Administrator Role")
                db.add(admin_role)
                await db.commit()
                await db.refresh(admin_role)
            user.role = admin_role
            user.is_superuser = True
            user.is_active = True
            user.status = "Active"
            db.add(user)
            await db.commit()
            await db.refresh(user)

    if not user:
        role_result = await db.execute(select(Role).where(Role.name == role_choice))
        role = role_result.scalars().first()
        if not role:
            role = Role(name=role_choice)
            db.add(role)
            await db.commit()
            await db.refresh(role)

        # Attempt to auto-link institution
        domain = email.split("@")[-1]
        inst_code = domain.split(".")[0]
        inst_result = await db.execute(select(Institution).where(Institution.code == inst_code))
        institution = inst_result.scalars().first()

        is_active = True
        status_str = "Active"
        is_superuser = False
        if email == "arjunr252005@gmail.com":
            is_superuser = True
        elif role.name == "Lecturer":
            is_active = False
            status_str = "Pending Approval"

        user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            password_hash=get_password_hash(uuid.uuid4().hex),  # Random password
            role=role,
            institution=institution,
            is_active=is_active,
            is_superuser=is_superuser,
            status=status_str
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    if not user.is_active or user.status != "Active":
        err_detail = "Inactive user account"
        if user.status == "Pending Approval":
            err_detail = "Your lecturer account is pending approval by the admin. Please try again later."
        elif user.status == "Rejected":
            err_detail = "Your lecturer account registration was rejected by the admin."
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_detail
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

from app.auth.dependencies import get_current_user


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        role_name=current_user.role.name if current_user.role else None,
        institution_id=current_user.institution_id,
        status=current_user.status,
    )