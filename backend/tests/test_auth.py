import pytest
import uuid
from httpx import ASGITransport, AsyncClient
from jose import jwt
from sqlalchemy.future import select
from app.main import app
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User, Role
from app.models.skills import Certificate

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest.fixture
async def db_session():
    async for session in get_db():
        yield session

@pytest.fixture
async def test_user_cleanup(db_session):
    # Unique emails to avoid database conflicts
    email = f"test_auth_{uuid.uuid4().hex[:8]}@example.com"
    email_lecturer = f"test_lecturer_{uuid.uuid4().hex[:8]}@example.com"
    
    yield {"student_email": email, "lecturer_email": email_lecturer}
    
    # Cleanup after test runs
    for m in [email, email_lecturer]:
        result = await db_session.execute(select(User).where(User.email == m))
        user = result.scalars().first()
        if user:
            # Delete certificates/badges/conversations first if any
            await db_session.execute(
                select(Certificate).where(Certificate.user_id == user.id)
            )
            await db_session.delete(user)
            await db_session.commit()

@pytest.mark.anyio
async def test_full_auth_and_edge_cases(test_user_cleanup, db_session):
    student_email = test_user_cleanup["student_email"]
    password = "securepassword123"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Part A: Main Happy Path
        # 1. Register manual student
        reg_response = await ac.post(
            "/api/v1/auth/register",
            json={
                "email": student_email,
                "first_name": "Test",
                "last_name": "Student",
                "password": password,
                "role_name": "Student"
            }
        )
        assert reg_response.status_code == 400
        assert "verify your email" in reg_response.json()["detail"].lower()

        # Fetch created user from database to inspect verification status
        user_result = await db_session.execute(
            select(User).where(User.email == student_email)
        )
        user = user_result.scalars().first()
        assert user is not None
        assert user.is_email_verified is False
        assert user.reminders_enabled is True  # Defaults to True

        # 2. Login fails before email is verified
        login_fail_response = await ac.post(
            "/api/v1/auth/login",
            json={"email": student_email, "password": password}
        )
        assert login_fail_response.status_code == 400
        assert "verify your email" in login_fail_response.json()["detail"].lower()

        # 3. Simulate email verification
        from datetime import datetime, timedelta
        expire = datetime.utcnow() + timedelta(hours=24)
        verification_token = jwt.encode(
            {"sub": student_email, "type": "email_verification", "exp": expire},
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM
        )

        verify_response = await ac.get(
            f"/api/v1/auth/verify-email?token={verification_token}"
        )
        assert verify_response.status_code == 200
        assert "verified successfully" in verify_response.json()["message"].lower()

        # Verify database reflects verified email status
        await db_session.refresh(user)
        assert user.is_email_verified is True

        # 4. Login succeeds after verification
        login_success_response = await ac.post(
            "/api/v1/auth/login",
            json={"email": student_email, "password": password}
        )
        assert login_success_response.status_code == 200
        login_data = login_success_response.json()
        assert "access_token" in login_data
        assert "refresh_token" in login_data
        
        access_token = login_data["access_token"]
        refresh_token = login_data["refresh_token"]

        # 5. Verify refresh token rotation
        refresh_response = await ac.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token}
        )
        assert refresh_response.status_code == 200
        refresh_data = refresh_response.json()
        assert "access_token" in refresh_data
        assert "refresh_token" in refresh_data
        
        new_access_token = refresh_data["access_token"]

        # 6. Test Forgot Password and Reset Password flow
        forgot_response = await ac.post(
            "/api/v1/auth/forgot-password",
            json={"email": student_email}
        )
        assert forgot_response.status_code == 200
        forgot_data = forgot_response.json()
        assert "token" in forgot_data
        reset_token = forgot_data["token"]

        new_password = "evenmoreserialkey456"
        reset_response = await ac.post(
            "/api/v1/auth/reset-password",
            json={
                "token": reset_token,
                "new_password": new_password
            }
        )
        assert reset_response.status_code == 200
        assert "reset successfully" in reset_response.json()["message"].lower()

        # Login with new password
        login_new_response = await ac.post(
            "/api/v1/auth/login",
            json={"email": student_email, "password": new_password}
        )
        assert login_new_response.status_code == 200
        new_access_token = login_new_response.json()["access_token"]

        # 7. Test toggle reminders preference endpoint
        toggle_response = await ac.post(
            "/api/v1/users/toggle-reminders",
            headers={"Authorization": f"Bearer {new_access_token}"}
        )
        assert toggle_response.status_code == 200
        assert toggle_response.json()["reminders_enabled"] is False

        # Toggle back to True
        toggle_back_response = await ac.post(
            "/api/v1/users/toggle-reminders",
            headers={"Authorization": f"Bearer {new_access_token}"}
        )
        assert toggle_back_response.status_code == 200
        assert toggle_back_response.json()["reminders_enabled"] is True

        # 8. Test Admin triggering daily reminder emails
        # Register a temporary admin or promote this user temporarily to trigger the admin endpoint
        user.is_superuser = True
        db_session.add(user)
        await db_session.commit()

        reminders_trigger_response = await ac.post(
            "/api/v1/users/send-reminders",
            headers={"Authorization": f"Bearer {new_access_token}"}
        )
        assert reminders_trigger_response.status_code == 200
        assert "processed and sent" in reminders_trigger_response.json()["message"].lower()

        # Part B: Edge Cases and Errors
        # 1. Duplicate registration should fail
        dup_reg = await ac.post(
            "/api/v1/auth/register",
            json={
                "email": student_email,
                "first_name": "Unique",
                "last_name": "Test",
                "password": password,
                "role_name": "Student"
            }
        )
        assert dup_reg.status_code == 400
        assert "already exists" in dup_reg.json()["detail"].lower()

        # 2. Login invalid password
        login_wrong_pass = await ac.post(
            "/api/v1/auth/login",
            json={"email": student_email, "password": "wrongpassword"}
        )
        assert login_wrong_pass.status_code == 400
        assert "incorrect email or password" in login_wrong_pass.json()["detail"].lower()

        # 3. Login non-existent email
        login_fake_email = await ac.post(
            "/api/v1/auth/login",
            json={"email": "nonexistent_fake_user@example.com", "password": password}
        )
        assert login_fake_email.status_code == 400
        assert "incorrect email or password" in login_fake_email.json()["detail"].lower()

        # 4. Verify email with invalid token format
        verify_invalid = await ac.get("/api/v1/auth/verify-email?token=invalidjwttokenhere")
        assert verify_invalid.status_code == 400
        assert "invalid or expired" in verify_invalid.json()["detail"].lower()

        # 5. Token refresh with invalid token
        refresh_invalid = await ac.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalidrefreshtokenhere"}
        )
        assert refresh_invalid.status_code == 401
        assert "invalid refresh token" in refresh_invalid.json()["detail"].lower()

        # 6. Reset password with invalid token
        reset_invalid = await ac.post(
            "/api/v1/auth/reset-password",
            json={"token": "invalidresettoken", "new_password": "newpassword123"}
        )
        assert reset_invalid.status_code == 400
        assert "invalid or expired reset token" in reset_invalid.json()["detail"].lower()

        # 7. Test get current user route (/auth/me) with invalid authorization header
        me_no_auth = await ac.get("/api/v1/auth/me")
        assert me_no_auth.status_code == 401

        # 8. Onboarding test case
        user.is_onboarded = False
        db_session.add(user)
        await db_session.commit()
        
        # Call onboarding
        onboard_res = await ac.post(
            "/api/v1/auth/onboarding",
            json={"role_name": "Student", "institution_code": None},
            headers={"Authorization": f"Bearer {new_access_token}"}
        )
        assert onboard_res.status_code == 200
        assert onboard_res.json()["user"]["is_onboarded"] is True
