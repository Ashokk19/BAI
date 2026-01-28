# Fix Database Permissions for BAI Backend
# This script grants necessary permissions to the bai_user

Write-Host "Fixing database permissions for BAI Backend..." -ForegroundColor Green

# Database connection details
$dbHost = "localhost"
$dbPort = "5432"
$dbName = "bai_db"
$dbUser = "bai_user"
$superUser = "postgres"  # Change this if your superuser is different

Write-Host "Connecting to PostgreSQL as superuser to grant permissions..." -ForegroundColor Yellow

# SQL commands to grant permissions
$sqlCommands = @"
-- Grant schema permissions
GRANT ALL PRIVILEGES ON SCHEMA public TO $dbUser;

-- Grant table permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $dbUser;

-- Grant sequence permissions
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $dbUser;

-- Grant default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $dbUser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $dbUser;

-- Grant database connection permission
GRANT CONNECT ON DATABASE $dbName TO $dbUser;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO $dbUser;

-- Grant create permission on schema
GRANT CREATE ON SCHEMA public TO $dbUser;

SELECT 'Permissions granted successfully to $dbUser' as result;
"@

try {
    # Try to execute the SQL commands
    Write-Host "Executing permission grants..." -ForegroundColor Yellow
    
    # You can run this manually in pgAdmin or psql:
    Write-Host "Please run the following SQL commands as the PostgreSQL superuser ($superUser):" -ForegroundColor Cyan
    Write-Host $sqlCommands -ForegroundColor White
    
    Write-Host "`nAlternatively, you can run this command in PowerShell:" -ForegroundColor Cyan
    Write-Host "psql -h $dbHost -p $dbPort -U $superUser -d $dbName -c `"$($sqlCommands -replace '"', '\"')`"" -ForegroundColor White
    
    Write-Host "`nOr connect to pgAdmin and run the SQL commands there." -ForegroundColor Cyan
}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please run the SQL commands manually in pgAdmin or psql." -ForegroundColor Yellow
}

Write-Host "`nAfter running the SQL commands, restart your backend server." -ForegroundColor Green
