# Quick PostgreSQL Migration Setup Guide

## Step 1: Setup PostgreSQL Database

**Option A: Using Command Line (Recommended)**

Open Command Prompt as Administrator and run:

```cmd
# Connect to PostgreSQL as superuser
psql -U postgres -h localhost

# Run these SQL commands:
DROP DATABASE IF EXISTS bai_db;
CREATE DATABASE bai_db;
DROP USER IF EXISTS bai_user;
CREATE USER bai_user WITH PASSWORD 'bai_password';
GRANT ALL PRIVILEGES ON DATABASE bai_db TO bai_user;
ALTER DATABASE bai_db OWNER TO bai_user;

# Connect to the new database
\c bai_db;

# Grant schema privileges
GRANT ALL ON SCHEMA public TO bai_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO bai_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO bai_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO bai_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO bai_user;

# Exit
\q
```

**Option B: Using pgAdmin**

1. Open pgAdmin
2. Create new database: `bai_db`
3. Create new user: `bai_user` with password `bai_password`
4. Grant all privileges on `bai_db` to `bai_user`

## Step 2: Run Migration

Once the database is set up, run:

```cmd
python manual_migration_steps.py
```

## Step 3: Verify Migration

```cmd
python verify_postgres_migration.py
```

## Troubleshooting

### If you get "permission denied" errors:
1. Make sure PostgreSQL service is running
2. Ensure you created the database with proper permissions (Step 1)
3. Try connecting manually: `psql -U bai_user -h localhost -d bai_db`

### If you get "module not found" errors:
```cmd
pip install -r backend/requirements.txt
```

### If migration fails:
1. Check PostgreSQL logs
2. Ensure SQLite database exists: `backend/bai_db.db`
3. Try the manual approach step by step

## Manual Steps (If Scripts Fail)

1. **Create Tables**: Run the SQL from `manual_migration_steps.py` directly in pgAdmin
2. **Migrate Data**: Use a database migration tool like DBeaver to copy data
3. **Update Settings**: Ensure `backend/config/settings.py` has correct credentials

## Success Indicators

After successful migration:
- ✅ All tables exist with composite primary keys (account_id, id)
- ✅ Data is migrated from SQLite
- ✅ Backend server starts without errors
- ✅ API endpoints work correctly

## Next Steps

1. Start backend: `cd backend && uvicorn app.main:app --reload`
2. Test API at: `http://localhost:8001/docs`
3. Update any custom queries to use composite keys
