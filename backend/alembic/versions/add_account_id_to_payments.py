"""add account_id to payments table

Revision ID: add_account_id_to_payments
Revises: 9a50bfbed986
Create Date: 2025-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_account_id_to_payments'
down_revision = '9a50bfbed986'
branch_labels = None
depends_on = None


def upgrade():
    # Add account_id column to payments table
    op.add_column('payments', sa.Column('account_id', sa.String(100), nullable=False, server_default='TestAccount'))
    op.create_index(op.f('ix_payments_account_id'), 'payments', ['account_id'], unique=False)


def downgrade():
    # Remove account_id column from payments table
    op.drop_index(op.f('ix_payments_account_id'), table_name='payments')
    op.drop_column('payments', 'account_id')

