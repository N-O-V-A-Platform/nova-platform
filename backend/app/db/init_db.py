from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.user import Role

async def init_db(db: AsyncSession) -> None:
    """
    Seed initial database data like roles.
    """
    roles = ["Admin", "Lecturer", "Student"]
    for role_name in roles:
        result = await db.execute(select(Role).where(Role.name == role_name))
        if not result.scalars().first():
            role = Role(name=role_name)
            db.add(role)
    await db.commit()
