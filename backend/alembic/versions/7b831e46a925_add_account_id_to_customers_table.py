"""add_account_id_to_customers_table

Revision ID: 7b831e46a925
Revises: 2c056c2a38ac
Create Date: 2025-08-12 13:06:28.315524

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7b831e46a925'
down_revision: Union[str, Sequence[str], None] = '2c056c2a38ac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add account_id column to customers table
    op.add_column('customers', sa.Column('account_id', sa.String(100), nullable=False, server_default='TestAccount'))
    op.create_index(op.f('ix_customers_account_id'), 'customers', ['account_id'], unique=False)
    
    # Update existing customers to have TestAccount account_id
    op.execute("UPDATE customers SET account_id = 'TestAccount' WHERE account_id IS NULL OR account_id = ''")


def downgrade() -> None:
    """Downgrade schema."""
    # Remove account_id column and index
    op.drop_index(op.f('ix_customers_account_id'), table_name='customers')
    op.drop_column('customers', 'account_id')
