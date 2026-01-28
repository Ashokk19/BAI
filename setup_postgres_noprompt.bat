@echo off
setlocal enabledelayedexpansion

echo Setting up PostgreSQL database...

set PGPASSWORD=postgres
set PGBIN="C:\Program Files\PostgreSQL\17\bin\psql.exe"
set PGUSER=postgres
set PGHOST=localhost

echo Creating database...
%PGBIN% -U %PGUSER% -h %PGHOST% -c "CREATE DATABASE bai_db;"

if %ERRORLEVEL% NEQ 0 (
    echo Error creating database
    pause
    exit /b %ERRORLEVEL%
)

echo Creating user...
%PGBIN% -U %PGUSER% -h %PGHOST% -c "CREATE USER bai_user WITH PASSWORD 'bai_password';"

if %ERRORLEVEL% NEQ 0 (
    echo Error creating user
    pause
    exit /b %ERRORLEVEL%
)

echo Granting privileges...
%PGBIN% -U %PGUSER% -h %PGHOST% -c "GRANT ALL PRIVILEGES ON DATABASE bai_db TO bai_user;"
%PGBIN% -U %PGUSER% -h %PGHOST% -d bai_db -c "
    GRANT ALL ON SCHEMA public TO bai_user;
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO bai_user;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO bai_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO bai_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO bai_user;
"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ PostgreSQL database setup completed successfully!
    echo.
    echo Database Information:
    echo    Host:     localhost
    echo    Database: bai_db
    echo    User:     bai_user
    echo    Password: bai_password
    echo.
    echo You can now proceed with running the migration script.
) else (
    echo.
    echo ❌ Error setting up PostgreSQL database.
)

pause
