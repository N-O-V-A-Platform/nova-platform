import asyncio
from sqlalchemy.future import select
from app.db.session import AsyncSessionLocal
from app.models.user import User, Role
from app.auth.security import get_password_hash

async def seed_or_update_admin():
    email = "admin@nova.edu"
    password = "NovaAdminSecret2026!#"
    first_name = "Arjun"
    last_name = "Administrator"

    async with AsyncSessionLocal() as db:
        role_result = await db.execute(select(Role).where(Role.name == "Admin"))
        role = role_result.scalars().first()
        if not role:
            role = Role(name="Admin")
            db.add(role)
            await db.commit()
            await db.refresh(role)

        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()
        
        hashed = get_password_hash(password)
        if user:
            user.password_hash = hashed
            user.role_id = role.id
            user.is_superuser = True
            user.is_active = True
            user.status = "Active"
            print(f"[NOVA] Admin user '{email}' password updated.")
        else:
            user = User(
                email=email,
                first_name=first_name,
                last_name=last_name,
                password_hash=hashed,
                role_id=role.id,
                is_superuser=True,
                is_active=True,
                status="Active"
            )
            db.add(user)
            print(f"[NOVA] Admin user '{email}' created.")
            
        await db.commit()
        print("Success: Admin credential active: admin@nova.edu / NovaAdminSecret2026!#")

if __name__ == "__main__":
    asyncio.run(seed_or_update_admin())
