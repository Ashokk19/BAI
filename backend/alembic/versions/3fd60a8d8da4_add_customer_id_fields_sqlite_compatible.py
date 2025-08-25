"""add_customer_id_fields_sqlite_compatible

Revision ID: 3fd60a8d8da4
Revises: 9a50bfbed986
Create Date: 2025-08-11 19:18:09.920833

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3fd60a8d8da4'
down_revision: Union[str, Sequence[str], None] = '9a50bfbed986'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add customer_id to users table
    op.add_column('users', sa.Column('customer_id', sa.String(100), nullable=False, server_default='TestCustomer'))
    
    # Add customer_id to item_categories table
    op.add_column('item_categories', sa.Column('customer_id', sa.String(100), nullable=False, server_default='TestCustomer'))
    
    # Add customer_id to items table
    op.add_column('items', sa.Column('customer_id', sa.String(100), nullable=False, server_default='TestCustomer'))
    
    # Add customer_id to inventory_logs table
    op.add_column('inventory_logs', sa.Column('customer_id', sa.String(100), nullable=False, server_default='TestCustomer'))
    
    # Update existing records to have TestCustomer customer_id
    op.execute("UPDATE users SET customer_id = 'TestCustomer' WHERE customer_id IS NULL OR customer_id = ''")
    op.execute("UPDATE item_categories SET customer_id = 'TestCustomer' WHERE customer_id IS NULL OR customer_id = ''")
    op.execute("UPDATE items SET customer_id = 'TestCustomer' WHERE customer_id IS NULL OR customer_id = ''")
    op.execute("UPDATE inventory_logs SET customer_id = 'TestCustomer' WHERE customer_id IS NULL OR customer_id = ''")


def downgrade() -> None:
    """Downgrade schema."""
    # Remove customer_id columns
    op.drop_column('inventory_logs', 'customer_id')
    op.drop_column('items', 'customer_id')
    op.drop_column('item_categories', 'customer_id')
    op.drop_column('users', 'customer_id')
