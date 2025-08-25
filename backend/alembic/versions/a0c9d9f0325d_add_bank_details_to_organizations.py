"""add_bank_details_to_organizations

Revision ID: a0c9d9f0325d
Revises: b44fd7c998c4
Create Date: 2025-08-23 22:41:18.053163

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a0c9d9f0325d'
down_revision: Union[str, Sequence[str], None] = 'b44fd7c998c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add bank-related columns to organizations table
    op.add_column('organizations', sa.Column('bank_name', sa.String(length=255), nullable=True))
    op.add_column('organizations', sa.Column('bank_account_number', sa.String(length=50), nullable=True))
    op.add_column('organizations', sa.Column('bank_account_holder_name', sa.String(length=255), nullable=True))
    op.add_column('organizations', sa.Column('bank_ifsc_code', sa.String(length=20), nullable=True))
    op.add_column('organizations', sa.Column('bank_branch_name', sa.String(length=255), nullable=True))
    op.add_column('organizations', sa.Column('bank_branch_address', sa.Text(), nullable=True))
    op.add_column('organizations', sa.Column('bank_account_type', sa.String(length=50), nullable=True))
    op.add_column('organizations', sa.Column('bank_swift_code', sa.String(length=20), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove bank-related columns from organizations table
    op.drop_column('organizations', 'bank_swift_code')
    op.drop_column('organizations', 'bank_account_type')
    op.drop_column('organizations', 'bank_branch_address')
    op.drop_column('organizations', 'bank_branch_name')
    op.drop_column('organizations', 'bank_ifsc_code')
    op.drop_column('organizations', 'bank_account_holder_name')
    op.drop_column('organizations', 'bank_account_number')
    op.drop_column('organizations', 'bank_name')
