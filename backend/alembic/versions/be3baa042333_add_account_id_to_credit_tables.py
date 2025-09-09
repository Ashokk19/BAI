"""add_account_id_to_credit_tables

Revision ID: be3baa042333
Revises: b325610226a8
Create Date: 2025-09-09 21:50:50.230280

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'be3baa042333'
down_revision: Union[str, Sequence[str], None] = 'b325610226a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add account_id column to customer_credits table
    op.add_column('customer_credits', sa.Column('account_id', sa.String(100), nullable=False, default='TestAccount'))
    op.create_index('ix_customer_credits_account_id', 'customer_credits', ['account_id'])
    
    # Add account_id column to credit_transactions table
    op.add_column('credit_transactions', sa.Column('account_id', sa.String(100), nullable=False, default='TestAccount'))
    op.create_index('ix_credit_transactions_account_id', 'credit_transactions', ['account_id'])


def downgrade() -> None:
    """Downgrade schema."""
    # Remove indexes
    op.drop_index('ix_credit_transactions_account_id', 'credit_transactions')
    op.drop_index('ix_customer_credits_account_id', 'customer_credits')
    
    # Remove account_id columns
    op.drop_column('credit_transactions', 'account_id')
    op.drop_column('customer_credits', 'account_id')
