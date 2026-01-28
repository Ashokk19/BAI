# PostgreSQL Migration Guide

## Overview

This guide documents the migration from SQLite to PostgreSQL with composite primary keys using `account_id` for the BAI application.

## Migration Status

### ✅ Completed Tasks

1. **Database Configuration Updated**
   - Changed `DATABASE_TYPE` from "sqlite" to "postgresql" in `backend/config/settings.py`
   - Updated database credentials (user: `bai_user`, password: `bai_password`)

2. **Dependencies**
   - `psycopg2-binary==2.9.10` already installed in requirements.txt

3. **Model Updates**
   - Updated Customer model with composite primary key (`account_id`, `id`)
   - Updated Invoice model with composite primary key and foreign key constraints
   - Updated InvoiceItem model with composite primary key and foreign key constraints
   - Updated Payment model with composite primary key
   - Added necessary imports for `PrimaryKeyConstraint` and `ForeignKeyConstraint`

4. **Migration Scripts Created**
   - `backend/setup_postgres.sql` - SQL commands to create database and user
   - `backend/migrate_to_postgres.py` - Python script to migrate data from SQLite
   - `backend/alembic/versions/postgres_composite_keys_migration.py` - Alembic migration
   - `setup_postgres_migration.py` - Comprehensive setup script

### 🔄 Remaining Tasks

1. **Complete Model Updates**
   - Update remaining models (User, Organization, Item, ItemCategory, etc.)
   - Ensure all foreign key relationships use composite keys

2. **Database Setup**
   - Install and configure PostgreSQL
   - Create database and user using `setup_postgres.sql`

3. **Run Migration**
   - Execute the migration using `setup_postgres_migration.py`

## Migration Steps

### Step 1: PostgreSQL Installation and Setup

1. Install PostgreSQL on your system
2. Start PostgreSQL service
3. Connect as superuser and run the SQL commands from `backend/setup_postgres.sql`:

```sql
-- Create database
CREATE DATABASE bai_db;

-- Create user
CREATE USER bai_user WITH PASSWORD 'bai_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE bai_db TO bai_user;

-- Connect to the database and grant schema privileges
\c bai_db;
GRANT ALL ON SCHEMA public TO bai_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO bai_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO bai_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO bai_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO bai_user;
```

### Step 2: Run Migration Script

Execute the comprehensive migration script:

```bash
python setup_postgres_migration.py
```

This script will:
1. Backup your SQLite database
2. Test PostgreSQL connection
3. Run Alembic migrations to create the new schema
4. Migrate data from SQLite to PostgreSQL
5. Verify the migration

### Step 3: Update Application Code

After migration, you may need to update application code that:
- Queries data using the old primary key structure
- Creates new records without specifying `account_id`
- Uses foreign key relationships

## Schema Changes

### Primary Key Structure

**Before (SQLite):**
```sql
CREATE TABLE customers (
    id INTEGER PRIMARY KEY,
    account_id VARCHAR(100) NOT NULL,
    ...
);
```

**After (PostgreSQL):**
```sql
CREATE TABLE customers (
    account_id VARCHAR(100) NOT NULL,
    id INTEGER NOT NULL,
    ...,
    PRIMARY KEY (account_id, id)
);
```

### Foreign Key Relationships

**Before:**
```sql
CREATE TABLE invoices (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    ...
);
```

**After:**
```sql
CREATE TABLE invoices (
    account_id VARCHAR(50) NOT NULL,
    id INTEGER NOT NULL,
    customer_account_id VARCHAR(50) NOT NULL,
    customer_id INTEGER NOT NULL,
    ...,
    PRIMARY KEY (account_id, id),
    FOREIGN KEY (customer_account_id, customer_id) REFERENCES customers(account_id, id)
);
```

## Benefits of New Schema

1. **Multi-tenancy Support**: Each account has its own data space
2. **Data Isolation**: Account data is properly separated
3. **Scalability**: Better support for multiple organizations
4. **Data Integrity**: Composite foreign keys ensure referential integrity within accounts

## Rollback Plan

If you need to rollback:

1. Stop the application
2. Restore from the SQLite backup created during migration
3. Revert the database configuration in `settings.py`
4. Restart the application

## Testing

After migration, test:

1. **Database Connection**: Verify the application connects to PostgreSQL
2. **Data Integrity**: Check that all data was migrated correctly
3. **Functionality**: Test all CRUD operations
4. **Performance**: Monitor query performance
5. **Multi-tenancy**: Verify account isolation works correctly

## Troubleshooting

### Common Issues

1. **Connection Refused**: Check PostgreSQL service is running
2. **Authentication Failed**: Verify user credentials and permissions
3. **Migration Errors**: Check Alembic logs for specific errors
4. **Data Type Issues**: Some SQLite data types may need conversion

### Logs to Check

- PostgreSQL logs: Usually in `/var/log/postgresql/`
- Application logs: Check FastAPI/Uvicorn output
- Alembic logs: Check migration output

## Performance Considerations

1. **Indexes**: Composite primary keys automatically create indexes
2. **Query Optimization**: Update queries to use account_id in WHERE clauses
3. **Connection Pooling**: PostgreSQL handles connections differently than SQLite
4. **Vacuum**: Regular maintenance may be needed for PostgreSQL

## Security Notes

1. Change default passwords in production
2. Use environment variables for database credentials
3. Configure PostgreSQL authentication properly
4. Enable SSL for production deployments

## Next Steps

1. Complete the migration using the provided scripts
2. Update any remaining application code
3. Test thoroughly in a staging environment
4. Plan production deployment
5. Monitor performance and optimize as needed
