# Check current table structure
$env:PGPASSWORD = "postgres"
$PGBIN = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
$PGUSER = "postgres"
$PGHOST = "localhost"
$DATABASE = "bai_db"

Write-Host "Checking current table structure..." -ForegroundColor Green

# Check tables
$listTablesSQL = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
Write-Host "Current tables:" -ForegroundColor Cyan
$listTablesSQL | & $PGBIN -U $PGUSER -h $PGHOST -d $DATABASE

# Check primary key structure for customers table
Write-Host "`nPrimary key structure for customers table:" -ForegroundColor Cyan
$pkSQL = "SELECT column_name, ordinal_position FROM information_schema.key_column_usage WHERE table_name = 'customers' AND constraint_name LIKE '%_pkey' ORDER BY ordinal_position;"
$pkSQL | & $PGBIN -U $PGUSER -h $PGHOST -d $DATABASE

# Check column structure for customers table
Write-Host "`nColumn structure for customers table:" -ForegroundColor Cyan
$columnsSQL = "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'customers' ORDER BY ordinal_position;"
$columnsSQL | & $PGBIN -U $PGUSER -h $PGHOST -d $DATABASE
