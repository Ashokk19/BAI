# PostgreSQL Migration - Complete Setup

## Overview

All required files and scripts have been created for migrating your BAI application from SQLite to PostgreSQL with composite primary keys using `account_id`.

## What Was Created/Updated

### ✅ Model Updates
- **Fixed `PaymentLog` model** in `backend/models/payment.py` to use composite primary key and foreign keys
- All models now use `PrimaryKeyConstraint('account_id', 'id')` for multi-tenant support

### ✅ Database Configuration
- **Updated `backend/config/settings.py`** to use correct PostgreSQL credentials:
  - User: `bai_user`
  - Password: `bai_password`
  - Database: `bai_db`

### ✅ Alembic Migrations
- **`backend/alembic/versions/complete_postgres_composite_keys.py`** - Creates vendors, payments, payment_logs tables
- **`backend/alembic/versions/remaining_composite_tables.py`** - Creates all remaining tables with composite PKs

### ✅ Automation Scripts
- **`execute_postgres_migration.py`** - Automated migration execution
- **`verify_postgres_migration.py`** - Migration verification and status check

## Quick Start Migration

### Step 1: Setup PostgreSQL Database

First, create the PostgreSQL database and user. Run these SQL commands as PostgreSQL superuser:

```sql
-- Connect to PostgreSQL as superuser
psql -U postgres -h localhost

-- Create database and user
CREATE DATABASE bai_db;
CREATE USER bai_user WITH PASSWORD 'bai_password';
GRANT ALL PRIVILEGES ON DATABASE bai_db TO bai_user;

-- Connect to the database and grant schema privileges
\c bai_db;
GRANT ALL ON SCHEMA public TO bai_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO bai_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO bai_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO bai_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO bai_user;

\q
```

### Step 2: Run Automated Migration

Execute the automated migration script:

```bash
python execute_postgres_migration.py
```

This script will:
1. ✅ Check prerequisites
2. ✅ Backup your SQLite database
3. ✅ Test PostgreSQL connection
4. ✅ Run Alembic migrations to create schema
5. ✅ Migrate data from SQLite to PostgreSQL
6. ✅ Verify the migration

### Step 3: Verify Migration

Run the verification script to ensure everything is correct:

```bash
python verify_postgres_migration.py
```

This will check:
- ✅ All tables exist
- ✅ Composite primary keys are correct
- ✅ Foreign key constraints are in place
- ✅ Data was migrated successfully
- ✅ Account ID separation is working

## Manual Migration (Alternative)

If you prefer manual steps, follow the commands in `MIGRATION_COMMANDS.md`:

1. Create database and user (Step 1 above)
2. Run Alembic migrations:
   ```bash
   cd backend
   alembic upgrade head
   cd ..
   ```
3. Migrate data:
   ```bash
   python backend/migrate_to_postgres.py
   ```

## Verification

After migration, all tables will have:
- **Composite Primary Key**: `(account_id, id)`
- **Multi-tenant Support**: Data separated by `account_id`
- **Referential Integrity**: Composite foreign keys maintain relationships within accounts

### Key Tables with Composite PKs:
- `users` - User accounts
- `customers` - Customer records
- `vendors` - Vendor records
- `invoices` - Sales invoices
- `payments` - Payment records
- `items` - Inventory items
- `shipments` - Shipment tracking
- `sales_returns` - Return processing
- And all other business entities...

## Testing

After migration:

1. **Start the backend server**:
   ```bash
   cd backend
   uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
   ```

2. **Test API endpoints** at `http://localhost:8001/docs`

3. **Verify data integrity** by checking that all your existing data is present

## Rollback Plan

If you need to rollback:
1. Stop the application
2. Restore from the SQLite backup (created automatically)
3. Change `DATABASE_TYPE` back to `"sqlite"` in `backend/config/settings.py`
4. Restart the application

## Benefits of New Schema

✅ **Multi-tenancy**: Each account has isolated data  
✅ **Scalability**: Better performance with PostgreSQL  
✅ **Data Integrity**: Composite foreign keys ensure referential integrity  
✅ **Future-proof**: Ready for multiple organizations/accounts  

## Support

If you encounter issues:
1. Check PostgreSQL is running: `pg_ctl status`
2. Verify database connection: `psql -U bai_user -h localhost -d bai_db`
3. Review migration logs for specific errors
4. Run verification script to identify issues

---

**Status**: ✅ **READY FOR MIGRATION**  
**All required files created and configured**
