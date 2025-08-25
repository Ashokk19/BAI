"""remove_foreign_key_constraint_from_organizations

Revision ID: b44fd7c998c4
Revises: 826d54289879
Create Date: 2025-08-23 21:04:16.114124

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b44fd7c998c4'
down_revision: Union[str, Sequence[str], None] = '826d54289879'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # SQLite doesn't support dropping foreign key constraints directly
    # We need to recreate the table without the foreign key constraint
    
    # Create a new table without the foreign key constraint
    op.create_table('organizations_new',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('account_id', sa.String(), nullable=False),
        sa.Column('company_name', sa.String(length=255), nullable=False),
        sa.Column('business_type', sa.String(length=100), nullable=True),
        sa.Column('industry', sa.String(length=100), nullable=True),
        sa.Column('founded_year', sa.String(length=10), nullable=True),
        sa.Column('employee_count', sa.String(length=50), nullable=True),
        sa.Column('registration_number', sa.String(length=100), nullable=True),
        sa.Column('tax_id', sa.String(length=100), nullable=True),
        sa.Column('gst_number', sa.String(length=100), nullable=True),
        sa.Column('pan_number', sa.String(length=100), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('website', sa.String(length=255), nullable=True),
        sa.Column('currency', sa.String(length=10), nullable=True),
        sa.Column('timezone', sa.String(length=100), nullable=True),
        sa.Column('fiscal_year_start', sa.String(length=10), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('state', sa.String(length=100), nullable=True),
        sa.Column('postal_code', sa.String(length=20), nullable=True),
        sa.Column('country', sa.String(length=100), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('logo_url', sa.String(length=500), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('account_id')
    )
    
    # Copy data from old table to new table
    op.execute("""
        INSERT INTO organizations_new 
        SELECT * FROM organizations
    """)
    
    # Drop old table
    op.drop_table('organizations')
    
    # Rename new table to original name
    op.rename_table('organizations_new', 'organizations')
    
    # Create index on account_id
    op.create_index('ix_organizations_account_id', 'organizations', ['account_id'])


def downgrade() -> None:
    """Downgrade schema."""
    # This would recreate the foreign key constraint, but since we're fixing a bug,
    # we'll keep it simple and not implement the downgrade
    pass
