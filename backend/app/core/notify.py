import uuid
from typing import Optional, Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.realtime import manager


async def notify_users(
    db: AsyncSession,
    user_ids: Sequence[uuid.UUID],
    message: str,
    *,
    title: str = "N.O.V.A.",
    category: str = "general",
    link: Optional[str] = None,
    workflow_id: Optional[uuid.UUID] = None,
) -> list[Notification]:
    unique_ids = list({uid for uid in user_ids if uid})
    created: list[Notification] = []
    for user_id in unique_ids:
        item = Notification(
            user_id=user_id,
            workflow_id=workflow_id,
            title=title,
            category=category,
            link=link,
            message=message,
        )
        db.add(item)
        created.append(item)
    if created:
        await db.commit()
        for item in created:
            await db.refresh(item)
            await manager.send_to_user(
                str(item.user_id),
                "notification.created",
                {
                    "id": str(item.id),
                    "title": item.title,
                    "category": item.category,
                    "link": item.link,
                    "message": item.message,
                    "is_read": item.is_read,
                    "created_at": item.created_at.isoformat(),
                },
            )
    return created
