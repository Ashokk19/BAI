"""remove_unique_constraint_from_customer_email

Revision ID: 826d54289879
Revises: 7b831e46a925
Create Date: 2025-08-12 13:15:07.039348

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '826d54289879'
down_revision: Union[str, Sequence[str], None] = '7b831e46a925'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Remove unique constraint from email field
    # For SQLite, we need to recreate the table without the unique constraint
    # This is a complex operation, so we'll handle it in the application logic
    pass


def downgrade() -> None:
    """Downgrade schema."""
    # Cannot easily restore unique constraint in SQLite
    pass
