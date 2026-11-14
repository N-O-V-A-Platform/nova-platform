"""add notification metadata columns

Revision ID: g9b2c3d4e5f6
Revises: f8a1b2c3d4e5
Create Date: 2026-11-14
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "g9b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "f8a1b2c3d4e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Safely add title, category, and link columns to notifications if they don't exist
    conn = op.get_bind()
    columns = [row[0] for row in conn.execute(sa.text("SELECT column_name FROM information_schema.columns WHERE table_name='notifications'")).fetchall()]
    
    if "title" not in columns:
        op.add_column("notifications", sa.Column("title", sa.String(length=255), server_default="N.O.V.A.", nullable=False))
    if "category" not in columns:
        op.add_column("notifications", sa.Column("category", sa.String(length=50), server_default="general", nullable=False))
    if "link" not in columns:
        op.add_column("notifications", sa.Column("link", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("notifications", "link")
    op.drop_column("notifications", "category")
    op.drop_column("notifications", "title")
