@echo off
REM Batch file to setup PostgreSQL database for BAI application
REM Run this as Administrator

echo Setting up PostgreSQL database for BAI application...
echo =================================================
echo.
echo This script will:
echo 1. Create a new database named 'bai_db'
echo 2. Create a new user 'bai_user' with password 'bai_password'
echo 3. Set up all necessary privileges
echo.
echo Note: You'll need to enter the PostgreSQL superuser (postgres) password

echo.
set /p PG_PASSWORD=Enter PostgreSQL superuser (postgres) password: 

echo Creating database and user...
set PGPASSWORD=%PG_PASSWORD%
psql -U postgres -h localhost -c "CREATE DATABASE bai_db;"
psql -U postgres -h localhost -c "CREATE USER bai_user WITH PASSWORD 'bai_password';"
psql -U postgres -h localhost -c "GRANT ALL PRIVILEGES ON DATABASE bai_db TO bai_user;"

rem Set additional privileges
echo Setting up database privileges...
psql -U postgres -h localhost -d bai_db -c "GRANT ALL ON SCHEMA public TO bai_user;"
psql -U postgres -h localhost -d bai_db -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO bai_user;"
psql -U postgres -h localhost -d bai_db -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO bai_user;"
psql -U postgres -h localhost -d bai_db -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO bai_user;"
psql -U postgres -h localhost -d bai_db -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO bai_user;"

rem Clear the password from environment
set PGPASSWORD=

echo.
echo =================================================
echo ✅ PostgreSQL database setup completed successfully!
echo.
echo Database Information:
echo    Database: bai_db
echo    User:     bai_user
echo    Password: bai_password
echo.
echo You can now proceed with running the migration script.
echo =================================================
pause
