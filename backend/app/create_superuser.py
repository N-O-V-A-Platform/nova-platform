import asyncio
from sqlalchemy.future import select
from app.db.session import AsyncSessionLocal
from app.models.user import User, Role
from app.auth.security import get_password_hash

async def create_superuser():
    print("--- N.O.V.A. Admin Creation CLI Tool ---")
    
    email = input("Enter Admin Email: ").strip()
    first_name = input("Enter First Name: ").strip()
    last_name = input("Enter Last Name: ").strip()
    password = input("Enter Admin Password: ").strip()

    if not email or not password or not first_name:
        print("Error: Email, First Name, and Password are required.")
        return

    async with AsyncSessionLocal() as db:
        # Check if user already exists
        result = await db.execute(select(User).where(User.email == email))
        existing_user = result.scalars().first()
        if existing_user:
            print(f"Error: User with email {email} already exists.")
            return

        # Get or create Admin role
        role_result = await db.execute(select(Role).where(Role.name == "Admin"))
        role = role_result.scalars().first()
        if not role:
            role = Role(name="Admin", description="Administrator Role")
            db.add(role)
            await db.commit()
            await db.refresh(role)

        # Create user
        hashed_password = get_password_hash(password)
        admin_user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            password_hash=hashed_password,
            role=role,
            is_active=True,
            is_superuser=True,
            status="Active"
        )
        db.add(admin_user)
        await db.commit()
        await db.refresh(admin_user)
        print(f"Success: Admin account '{email}' created successfully.")

if __name__ == "__main__":
    asyncio.run(create_superuser())
