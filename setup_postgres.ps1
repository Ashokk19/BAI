# PowerShell script to setup PostgreSQL database for BAI application
# Run this script as Administrator

# PostgreSQL connection parameters
$pgUser = "postgres"  # Default superuser
$pgPassword = Read-Host -Prompt "Enter PostgreSQL superuser password" -AsSecureString
$pgPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($pgPassword))

# Database configuration
$dbName = "bai_db"
$dbUser = "bai_user"
$dbPassword = "bai_password"  # In production, use a more secure method

# Check if psql is in PATH
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "PostgreSQL client (psql) not found in PATH. Please ensure PostgreSQL is installed and added to PATH." -ForegroundColor Red
    exit 1
}

try {
    # Set PGPASSWORD environment variable for psql
    $env:PGPASSWORD = $pgPassword

    Write-Host "Creating database and user..." -ForegroundColor Cyan
    
    # Create database and user
    $createDbQuery = @"
    CREATE DATABASE $dbName;
    CREATE USER $dbUser WITH PASSWORD '$dbPassword';
    GRANT ALL PRIVILEGES ON DATABASE $dbName TO $dbUser;
"@

    # Execute the SQL commands
    $createDbQuery | & psql -U $pgUser -h localhost -d postgres -v ON_ERROR_STOP=1
    
    # Connect to the new database to set additional permissions
    $setPrivilegesQuery = @"
    \c $dbName
    GRANT ALL ON SCHEMA public TO $dbUser;
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $dbUser;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $dbUser;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $dbUser;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $dbUser;
"@

    Write-Host "Setting up database privileges..." -ForegroundColor Cyan
    $setPrivilegesQuery | & psql -U $pgUser -h localhost -d $dbName -v ON_ERROR_STOP=1

    Write-Host "`n✅ PostgreSQL database setup completed successfully!" -ForegroundColor Green
    Write-Host "   Database: $dbName" -ForegroundColor Green
    Write-Host "   User: $dbUser" -ForegroundColor Green
    Write-Host "   Password: $dbPassword" -ForegroundColor Green
    Write-Host "`nYou can now proceed with running the migration script." -ForegroundColor Cyan
}
catch {
    Write-Host "`n❌ An error occurred during database setup:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
finally {
    # Clear the password from memory
    $env:PGPASSWORD = $null
    Remove-Variable -Name pgPassword -ErrorAction SilentlyContinue
    [System.GC]::Collect()
}
