import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class ScrapedSource(Base):
    """
    Tracks every URL that has been scraped and indexed into Pinecone.
    Used to avoid redundant re-scrapes and to surface status in the admin UI.
    """
    __tablename__ = "scraped_sources"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    url: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    namespace: Mapped[str] = mapped_column(String(255), nullable=False, default="uipath_global")
    chunk_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")
    # status values: "pending" | "success" | "error"
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_scraped_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
