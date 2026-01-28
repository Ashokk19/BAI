# PowerShell script to setup PostgreSQL database for BAI application
# Run this script as Administrator

# PostgreSQL configuration
$pgPath = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
$pgUser = "postgres"
$pgPassword = "postgres"  # The password you provided
$dbName = "bai_db"
$dbUser = "bai_user"
$dbPassword = "bai_password"

# Function to execute a SQL command
function Invoke-PostgresCommand {
    param (
        [string]$sqlCommand
    )
    
    $env:PGPASSWORD = $pgPassword
    & $pgPath -U $pgUser -h localhost -c $sqlCommand
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error executing: $sqlCommand" -ForegroundColor Red
        exit 1
    }
}

try {
    Write-Host "Setting up PostgreSQL database..." -ForegroundColor Cyan
    
    # Create database
    Write-Host "Creating database $dbName..."
    Invoke-PostgresCommand "CREATE DATABASE $dbName;"
    
    # Create user
    Write-Host "Creating user $dbUser..."
    Invoke-PostgresCommand "CREATE USER $dbUser WITH PASSWORD '$dbPassword';"
    
    # Grant privileges
    Write-Host "Granting privileges..."
    Invoke-PostgresCommand "GRANT ALL PRIVILEGES ON DATABASE $dbName TO $dbUser;"
    
    # Connect to the new database to set additional permissions
    Write-Host "Setting up additional permissions..."
    $env:PGPASSWORD = $pgPassword
    & $pgPath -U $pgUser -h localhost -d $dbName -c "
        GRANT ALL ON SCHEMA public TO $dbUser;
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $dbUser;
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $dbUser;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $dbUser;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $dbUser;
    "

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
    [System.GC]::Collect()
}
