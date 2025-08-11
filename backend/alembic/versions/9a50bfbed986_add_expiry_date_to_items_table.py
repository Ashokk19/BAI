"""Add expiry_date to items table

Revision ID: 9a50bfbed986
Revises: 
Create Date: 2025-08-10 23:16:35.181129

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9a50bfbed986'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add expiry_date column to items table
    op.add_column('items', sa.Column('expiry_date', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove expiry_date column from items table
    op.drop_column('items', 'expiry_date')
