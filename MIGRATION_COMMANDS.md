# PostgreSQL Migration - Execution Commands

## Prerequisites

1. **Install PostgreSQL** (if not already installed)
   - Download from: https://www.postgresql.org/download/
   - Or use package manager: `choco install postgresql` (Windows)

2. **Start PostgreSQL Service**
   ```bash
   # Windows (as Administrator)
   net start postgresql-x64-14
   
   # Or start from Services.msc
   ```

## Step-by-Step Execution

### 1. Create PostgreSQL Database and User

Connect to PostgreSQL as superuser and run:

```bash
# Connect to PostgreSQL (replace 'postgres' with your superuser)
psql -U postgres -h localhost

# Then run these SQL commands:
```

```sql
-- Create database
CREATE DATABASE bai_db;

-- Create user
CREATE USER bai_user WITH PASSWORD 'bai_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE bai_db TO bai_user;

-- Connect to the database
\c bai_db;

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO bai_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO bai_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO bai_user;

-- Set default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO bai_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO bai_user;

-- Exit psql
\q
```

### 2. Test PostgreSQL Connection

```bash
# Test connection with new user
psql -U bai_user -h localhost -d bai_db
```

If successful, you should see the PostgreSQL prompt. Type `\q` to exit.

### 3. Run the Migration

From the BAI root directory, execute:

```bash
# Run the comprehensive migration script
python setup_postgres_migration.py
```

**Alternative Manual Steps:**

If the automated script fails, run these commands manually:

```bash
# 1. Backup SQLite database (already done)
# 2. Navigate to backend directory
cd backend

# 3. Create new migration (if needed)
python -c "
from alembic.config import Config
from alembic import command
cfg = Config('alembic.ini')
command.upgrade(cfg, 'postgres_composite_keys')
"

# 4. Go back to root directory
cd ..

# 5. Run data migration
python backend/migrate_to_postgres.py
```

### 4. Verify Migration

```bash
# Test the application
cd backend
python -c "
from database.database import engine
from sqlalchemy import text
with engine.connect() as conn:
    result = conn.execute(text('SELECT COUNT(*) FROM customers'))
    print(f'Customers migrated: {result.fetchone()[0]}')
    result = conn.execute(text('SELECT COUNT(*) FROM invoices'))
    print(f'Invoices migrated: {result.fetchone()[0]}')
"
```

### 5. Start the Application

```bash
# Start the backend server
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

# In another terminal, start the frontend
cd frontend
npm start
```

## Troubleshooting Commands

### Check PostgreSQL Status
```bash
# Windows
sc query postgresql-x64-14

# Check if PostgreSQL is listening
netstat -an | findstr :5432
```

### Reset Database (if needed)
```sql
-- Connect as superuser
psql -U postgres -h localhost

-- Drop and recreate database
DROP DATABASE IF EXISTS bai_db;
DROP USER IF EXISTS bai_user;

-- Then repeat Step 1
```

### Check Migration Status
```bash
cd backend
python -c "
from alembic.config import Config
from alembic import command
cfg = Config('alembic.ini')
command.current(cfg)
"
```

### View Database Tables
```sql
-- Connect to the database
psql -U bai_user -h localhost -d bai_db

-- List all tables
\dt

-- Check a specific table structure
\d customers

-- Count records in a table
SELECT COUNT(*) FROM customers;
```

## Files Created for Migration

1. **Configuration Files:**
   - `backend/setup_postgres.sql` - Database setup commands
   - `POSTGRES_MIGRATION_GUIDE.md` - Comprehensive guide

2. **Migration Scripts:**
   - `setup_postgres_migration.py` - Automated migration script
   - `backend/migrate_to_postgres.py` - Data migration script
   - `backend/alembic/versions/postgres_composite_keys_migration.py` - Schema migration

3. **Updated Models:**
   - `backend/models/customer.py` - Updated with composite PK
   - `backend/models/invoice.py` - Updated with composite PK and FK
   - `backend/models/payment.py` - Updated with composite PK

## Expected Results

After successful migration:

- ✅ PostgreSQL database `bai_db` created
- ✅ User `bai_user` with proper permissions
- ✅ All tables recreated with composite primary keys
- ✅ Data migrated from SQLite to PostgreSQL
- ✅ Application connects to PostgreSQL
- ✅ All functionality works with new schema

## Next Steps After Migration

1. **Test all application features thoroughly**
2. **Update any hardcoded queries in the application**
3. **Monitor performance and optimize if needed**
4. **Set up regular PostgreSQL maintenance tasks**
5. **Configure backup strategy for PostgreSQL**

## Support

If you encounter issues:

1. Check the `POSTGRES_MIGRATION_GUIDE.md` for detailed troubleshooting
2. Review PostgreSQL logs
3. Verify all prerequisites are met
4. Ensure PostgreSQL service is running
5. Check network connectivity and firewall settings
