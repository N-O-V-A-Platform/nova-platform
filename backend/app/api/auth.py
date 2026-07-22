import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from google.auth.exceptions import GoogleAuthError
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User, Role, RevokedToken
from app.models.institution import Institution
from app.schemas.user import (
    GoogleAuthRequest,
    RefreshTokenRequest,
    Token,
    UserCreate,
    UserLogin,
    UserResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    OnboardingRequest,
)
from app.auth.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _is_admin_email(email: str) -> bool:
    return email.strip().lower() in settings.admin_email_set


def _verify_google_id_token(token: str) -> dict:
    return google_id_token.verify_oauth2_token(
        token,
        google_requests.Request(),
        settings.GOOGLE_CLIENT_ID,
    )


def _google_profile_names(id_info: dict, email: str) -> tuple[str, str]:
    first_name = str(id_info.get("given_name") or "").strip()
    last_name = str(id_info.get("family_name") or "").strip()

    if not first_name:
        full_name = str(id_info.get("name") or "").strip()
        if full_name:
            name_parts = full_name.split(maxsplit=1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ""

    if not first_name:
        first_name = email.split("@", maxsplit=1)[0]

    return first_name, last_name


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
    
    if _is_admin_email(user_in.email):
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
    is_admin = _is_admin_email(user_in.email)
    is_email_verified = is_admin

    user = User(
        email=user_in.email,
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        password_hash=hashed_password,
        role=role,
        institution=institution,
        is_active=is_active if is_admin else (role_name == "Student"),
        is_superuser=is_superuser,
        is_email_verified=is_email_verified,
        is_onboarded=True,
        status=status_str
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    from datetime import datetime, timedelta
    if not is_email_verified:
        # Generate verification token
        expire = datetime.utcnow() + timedelta(hours=24)
        verification_token = jwt.encode(
            {"sub": user.email, "type": "email_verification", "exp": expire},
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM
        )
        # Send themed verification email
        from app.core.email import send_themed_email
        send_themed_email(
            to_email=user.email,
            subject="Verify Your N.O.V.A. Account",
            title="Account Verification",
            greeting=f"Hello {user.first_name}!",
            body_text="Welcome to N.O.V.A.! To finalize your registration, please verify your email address by clicking the button below. This link expires in 24 hours.",
            action_text="Verify My Account",
            action_url=f"{settings.FRONTEND_URL}/verify-email?token={verification_token}"
        )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration successful! An email verification link has been printed to the console. Please verify your email before logging in."
        )

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
    refresh_token, jti = create_refresh_token(subject=user.email)

    # Prepare response
    user_response = UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role_name=role.name,
        institution_id=user.institution_id,
        is_email_verified=user.is_email_verified,
        is_onboarded=user.is_onboarded,
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

    if not user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please verify your email before logging in."
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
    refresh_token, jti = create_refresh_token(subject=user.email)

    user_response = UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role_name=role_name,
        institution_id=user.institution_id,
        is_email_verified=user.is_email_verified,
        is_onboarded=user.is_onboarded,
        status=user.status
    )

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_response
    )

@router.post("/refresh", response_model=Token)
async def refresh_token(payload: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    try:
        token_data = jwt.decode(
            payload.refresh_token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    if token_data.get("type") != "refresh" or not token_data.get("sub") or not token_data.get("jti"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    # Check blacklist
    revoked_result = await db.execute(
        select(RevokedToken).where(RevokedToken.jti == token_data["jti"])
    )
    if revoked_result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked/reused",
        )

    # Blacklist the old token jti
    from datetime import datetime, timezone
    exp_timestamp = token_data.get("exp")
    expires_at = datetime.fromtimestamp(exp_timestamp, tz=timezone.utc).replace(tzinfo=None) if exp_timestamp else datetime.utcnow()
    revoked = RevokedToken(jti=token_data["jti"], expires_at=expires_at)
    db.add(revoked)

    result = await db.execute(
        select(User)
        .where(User.email == token_data["sub"])
        .options(selectinload(User.role))
    )
    user = result.scalars().first()
    if not user or not user.is_active or user.status != "Active":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User is not active",
        )

    role_name = user.role.name if user.role else "Student"
    access_token = create_access_token(
        subject=user.email,
        role=role_name,
        institution_id=user.institution_id,
        first_name=user.first_name,
        last_name=user.last_name,
    )
    new_refresh_token, new_jti = create_refresh_token(subject=user.email)

    await db.commit()

    user_response = UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role_name=role_name,
        institution_id=user.institution_id,
        is_email_verified=user.is_email_verified,
        is_onboarded=user.is_onboarded,
        status=user.status,
    )

    return Token(
        access_token=access_token,
        refresh_token=new_refresh_token,
        user=user_response,
    )

@router.post("/google", response_model=Token)
async def google_auth(payload: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth is not configured",
        )

    try:
        id_info = await run_in_threadpool(_verify_google_id_token, payload.id_token)
    except (ValueError, GoogleAuthError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google ID token",
        )

    email = str(id_info.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email not provided by Google",
        )

    if id_info.get("email_verified") is not True:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google email is not verified",
        )

    first_name, last_name = _google_profile_names(id_info, email)
    role_choice = "Student"

    # Force admin role choice if matching owner email
    if _is_admin_email(email):
        role_choice = "Admin"

    # Get or create user
    result = await db.execute(
        select(User)
        .where(User.email == email)
        .options(selectinload(User.role))
    )
    user = result.scalars().first()

    # Auto-promote existing account to admin if matching owner email
    if user and _is_admin_email(email):
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
        if _is_admin_email(email):
            is_superuser = True
        elif role.name == "Lecturer":
            is_active = False
            status_str = "Pending Approval"

        is_onboarded = True if _is_admin_email(email) else False
        user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            password_hash=get_password_hash(uuid.uuid4().hex),  # Random password
            role=role,
            institution=institution,
            is_active=is_active,
            is_superuser=is_superuser,
            is_email_verified=True,
            is_onboarded=is_onboarded,
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
    refresh_token, jti = create_refresh_token(subject=user.email)

    user_response = UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role_name=role_name,
        institution_id=user.institution_id,
        is_email_verified=user.is_email_verified,
        is_onboarded=user.is_onboarded,
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
        is_email_verified=current_user.is_email_verified,
        is_onboarded=current_user.is_onboarded,
        status=current_user.status,
    )


@router.get("/verify-email")
async def verify_email(token: str, db: AsyncSession = Depends(get_db)):
    try:
        token_data = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token",
        )

    if token_data.get("type") != "email_verification" or not token_data.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token type",
        )

    result = await db.execute(
        select(User)
        .where(User.email == token_data["sub"])
        .options(selectinload(User.role))
    )
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user.is_email_verified:
        return {"message": "Email is already verified."}

    user.is_email_verified = True
    
    # If Lecturer, they must be approved by the admin before login
    if user.role and user.role.name == "Lecturer":
        user.is_active = False
        user.status = "Pending Approval"
    else:
        user.is_active = True
        user.status = "Active"

    db.add(user)
    await db.commit()

    return {
        "message": "Email verified successfully! You can now log in." 
        if user.is_active 
        else "Email verified successfully! Your lecturer account is now pending admin approval."
    }


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalars().first()
    if not user:
        return {"message": "If the email exists, a password reset link has been printed to the console."}

    # Generate password reset token
    from datetime import datetime, timedelta
    expire = datetime.utcnow() + timedelta(minutes=15)
    reset_token = jwt.encode(
        {"sub": user.email, "type": "password_reset", "exp": expire},
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )

    # Send themed password reset email
    from app.core.email import send_themed_email
    send_themed_email(
        to_email=user.email,
        subject="Reset Your N.O.V.A. Password",
        title="Password Reset Request",
        greeting=f"Hello {user.first_name}!",
        body_text="We received a request to reset the password for your N.O.V.A. account. If you did not make this request, you can safely ignore this email. Otherwise, click the button below to set a new password. This link expires in 15 minutes.",
        action_text="Reset Password",
        action_url=f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
    )

    return {"message": "Password reset link sent.", "token": reset_token}


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    try:
        token_data = jwt.decode(
            payload.token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    if token_data.get("type") != "password_reset" or not token_data.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token type",
        )

    result = await db.execute(select(User).where(User.email == token_data["sub"]))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_444_NOT_RESPONSE_NOT_FOUND if hasattr(status, "HTTP_444_NOT_RESPONSE_NOT_FOUND") else 404,
            detail="User not found",
        )

    user.password_hash = get_password_hash(payload.new_password)
    db.add(user)
    await db.commit()

    return {"message": "Password has been reset successfully."}


@router.post("/onboarding", response_model=Token)
async def onboard_user(
    payload: OnboardingRequest, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.is_onboarded:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already onboarded"
        )

    role_name = payload.role_name
    
    # Fetch or create the role
    role_result = await db.execute(select(Role).where(Role.name == role_name))
    role = role_result.scalars().first()
    if not role:
        role = Role(name=role_name)
        db.add(role)
        await db.commit()
        await db.refresh(role)

    # Link institution if provided
    institution = None
    if payload.institution_code:
        inst_result = await db.execute(
            select(Institution).where(Institution.code == payload.institution_code)
        )
        institution = inst_result.scalars().first()
        if not institution:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid institution code"
            )

    current_user.role = role
    current_user.institution = institution
    current_user.is_onboarded = True

    if role_name == "Lecturer":
        current_user.is_active = False
        current_user.status = "Pending Approval"
    else:
        current_user.is_active = True
        current_user.status = "Active"

    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)

    # Return new Token response
    access_token = create_access_token(
        subject=current_user.email,
        role=role_name,
        institution_id=current_user.institution_id,
        first_name=current_user.first_name,
        last_name=current_user.last_name
    )
    refresh_token, new_jti = create_refresh_token(subject=current_user.email)

    user_response = UserResponse(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        role_name=role_name,
        institution_id=current_user.institution_id,
        is_email_verified=current_user.is_email_verified,
        is_onboarded=current_user.is_onboarded,
        status=current_user.status
    )

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_response
    )

