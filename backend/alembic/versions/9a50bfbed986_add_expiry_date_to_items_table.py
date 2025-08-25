"""Add customer_id fields for multi-tenant support

Revision ID: 9a50bfbed986
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '9a50bfbed986'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Add customer_id to users table
    op.add_column('users', sa.Column('customer_id', sa.String(100), nullable=False, server_default='TestCustomer'))
    op.create_index(op.f('ix_users_customer_id'), 'users', ['customer_id'], unique=False)
    
    # Add customer_id to item_categories table
    op.add_column('item_categories', sa.Column('customer_id', sa.String(100), nullable=False, server_default='TestCustomer'))
    op.create_index(op.f('ix_item_categories_customer_id'), 'item_categories', ['customer_id'], unique=False)
    
    # Remove unique constraint on item_categories.name since it's now customer-specific
    op.drop_constraint('item_categories_name_key', 'item_categories', type_='unique')
    
    # Add customer_id to items table
    op.add_column('items', sa.Column('customer_id', sa.String(100), nullable=False, server_default='TestCustomer'))
    op.create_index(op.f('ix_items_customer_id'), 'items', ['customer_id'], unique=False)
    
    # Remove unique constraint on items.sku since it's now customer-specific
    op.drop_constraint('items_sku_key', 'items', type_='unique')
    
    # Add customer_id to inventory_logs table
    op.add_column('inventory_logs', sa.Column('customer_id', sa.String(100), nullable=False, server_default='TestCustomer'))
    op.create_index(op.f('ix_inventory_logs_customer_id'), 'inventory_logs', ['customer_id'], unique=False)
    
    # Update existing users to have TestCustomer customer_id
    op.execute("UPDATE users SET customer_id = 'TestCustomer' WHERE customer_id IS NULL OR customer_id = ''")
    
    # Update existing item_categories to have TestCustomer customer_id
    op.execute("UPDATE item_categories SET customer_id = 'TestCustomer' WHERE customer_id IS NULL OR customer_id = ''")
    
    # Update existing items to have TestCustomer customer_id
    op.execute("UPDATE items SET customer_id = 'TestCustomer' WHERE customer_id IS NULL OR customer_id = ''")
    
    # Update existing inventory_logs to have TestCustomer customer_id
    op.execute("UPDATE inventory_logs SET customer_id = 'TestCustomer' WHERE customer_id IS NULL OR customer_id = ''")


def downgrade():
    # Remove customer_id columns and indexes
    op.drop_index(op.f('ix_inventory_logs_customer_id'), table_name='inventory_logs')
    op.drop_column('inventory_logs', 'customer_id')
    
    op.drop_index(op.f('ix_items_customer_id'), table_name='items')
    op.drop_column('items', 'customer_id')
    
    op.drop_index(op.f('ix_item_categories_customer_id'), table_name='item_categories')
    op.drop_column('item_categories', 'customer_id')
    
    op.drop_index(op.f('ix_users_customer_id'), table_name='users')
    op.drop_column('users', 'customer_id')
    
    # Restore unique constraints
    op.create_unique_constraint('items_sku_key', 'items', ['sku'])
    op.create_unique_constraint('item_categories_name_key', 'item_categories', ['name'])
