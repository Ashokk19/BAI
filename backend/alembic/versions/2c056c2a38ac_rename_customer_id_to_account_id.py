"""rename_customer_id_to_account_id

Revision ID: 2c056c2a38ac
Revises: 3fd60a8d8da4
Create Date: 2025-08-11 21:17:16.249431

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2c056c2a38ac'
down_revision: Union[str, Sequence[str], None] = '3fd60a8d8da4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Rename customer_id to account_id in users table
    op.alter_column('users', 'customer_id', new_column_name='account_id')
    
    # Rename customer_id to account_id in item_categories table
    op.alter_column('item_categories', 'customer_id', new_column_name='account_id')
    
    # Rename customer_id to account_id in items table
    op.alter_column('items', 'customer_id', new_column_name='account_id')
    
    # Rename customer_id to account_id in inventory_logs table
    op.alter_column('inventory_logs', 'customer_id', new_column_name='account_id')
    
    # Update default values from 'TestCustomer' to 'TestAccount'
    op.execute("UPDATE users SET account_id = 'TestAccount' WHERE account_id = 'TestCustomer'")
    op.execute("UPDATE item_categories SET account_id = 'TestAccount' WHERE account_id = 'TestCustomer'")
    op.execute("UPDATE items SET account_id = 'TestAccount' WHERE account_id = 'TestCustomer'")
    op.execute("UPDATE inventory_logs SET account_id = 'TestAccount' WHERE account_id = 'TestCustomer'")


def downgrade() -> None:
    """Downgrade schema."""
    # Rename account_id back to customer_id in all tables
    op.alter_column('users', 'account_id', new_column_name='customer_id')
    op.alter_column('item_categories', 'account_id', new_column_name='customer_id')
    op.alter_column('items', 'account_id', new_column_name='customer_id')
    op.alter_column('inventory_logs', 'account_id', new_column_name='customer_id')
    
    # Update default values back from 'TestAccount' to 'TestCustomer'
    op.execute("UPDATE users SET customer_id = 'TestCustomer' WHERE customer_id = 'TestAccount'")
    op.execute("UPDATE item_categories SET customer_id = 'TestCustomer' WHERE customer_id = 'TestAccount'")
    op.execute("UPDATE items SET customer_id = 'TestCustomer' WHERE customer_id = 'TestAccount'")
    op.execute("UPDATE inventory_logs SET customer_id = 'TestCustomer' WHERE customer_id = 'TestAccount'")
