# PowerShell script to create PostgreSQL tables for BAI application

$env:PGPASSWORD = "postgres"
$PGBIN = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
$PGUSER = "postgres"
$PGHOST = "localhost"
$DATABASE = "bai_db"

Write-Host "Creating PostgreSQL tables for BAI application..." -ForegroundColor Green

# SQL commands to create tables
$sql = @"
-- Create ENUM types if they don't exist
DO `$`$ BEGIN
    CREATE TYPE userrole AS ENUM ('admin', 'manager', 'staff', 'customer');
EXCEPTION
    WHEN duplicate_object THEN null;
END `$`$;

DO `$`$ BEGIN
    CREATE TYPE customertype AS ENUM ('individual', 'business');
EXCEPTION
    WHEN duplicate_object THEN null;
END `$`$;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role userrole DEFAULT 'staff',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    account_id VARCHAR(100) NOT NULL,
    name VARCHAR(200) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    tax_number VARCHAR(50),
    gst_number VARCHAR(50),
    logo_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    account_id VARCHAR(100) NOT NULL,
    customer_code VARCHAR(50) NOT NULL,
    company_name VARCHAR(200),
    contact_person VARCHAR(100),
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    mobile VARCHAR(20),
    website VARCHAR(255),
    billing_address TEXT,
    shipping_address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    customer_type customertype DEFAULT 'individual',
    tax_number VARCHAR(50),
    gst_number VARCHAR(50),
    credit_limit DECIMAL(12, 2) DEFAULT 0.00,
    payment_terms VARCHAR(50) DEFAULT 'immediate',
    currency VARCHAR(10) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create vendors table
CREATE TABLE IF NOT EXISTS vendors (
    id SERIAL PRIMARY KEY,
    account_id VARCHAR(100) NOT NULL,
    vendor_code VARCHAR(50) NOT NULL,
    company_name VARCHAR(200),
    contact_person VARCHAR(100),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    mobile VARCHAR(20),
    website VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    tax_number VARCHAR(50),
    gst_number VARCHAR(50),
    payment_terms VARCHAR(50) DEFAULT 'net_30',
    currency VARCHAR(10) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create items table
CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    account_id VARCHAR(100) NOT NULL,
    item_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    unit VARCHAR(20),
    purchase_price DECIMAL(12, 2),
    selling_price DECIMAL(12, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 0.00,
    stock_quantity DECIMAL(10, 2) DEFAULT 0.00,
    reorder_level DECIMAL(10, 2) DEFAULT 0.00,
    expiry_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    account_id VARCHAR(100) NOT NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id),
    issue_date DATE NOT NULL,
    due_date DATE,
    status VARCHAR(20) DEFAULT 'draft',
    subtotal DECIMAL(12, 2) NOT NULL,
    tax_amount DECIMAL(12, 2) DEFAULT 0.00,
    discount_amount DECIMAL(12, 2) DEFAULT 0.00,
    total_amount DECIMAL(12, 2) NOT NULL,
    notes TEXT,
    terms TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES items(id),
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 0.00,
    amount DECIMAL(12, 2) NOT NULL
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    account_id VARCHAR(100) NOT NULL,
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id),
    invoice_id INTEGER REFERENCES invoices(id),
    payment_date DATE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'cash',
    reference_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create purchases table
CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    account_id VARCHAR(100) NOT NULL,
    purchase_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id INTEGER REFERENCES vendors(id),
    purchase_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    subtotal DECIMAL(12, 2) NOT NULL,
    tax_amount DECIMAL(12, 2) DEFAULT 0.00,
    discount_amount DECIMAL(12, 2) DEFAULT 0.00,
    total_amount DECIMAL(12, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create purchase_items table
CREATE TABLE IF NOT EXISTS purchase_items (
    id SERIAL PRIMARY KEY,
    purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES items(id),
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 0.00,
    amount DECIMAL(12, 2) NOT NULL
);

-- Create inventory table
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    account_id VARCHAR(100) NOT NULL,
    item_id INTEGER NOT NULL REFERENCES items(id),
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    reserved_quantity DECIMAL(10, 2) DEFAULT 0.00,
    location VARCHAR(100),
    batch_number VARCHAR(50),
    expiry_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create inventory_transactions table
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id SERIAL PRIMARY KEY,
    account_id VARCHAR(100) NOT NULL,
    item_id INTEGER NOT NULL REFERENCES items(id),
    transaction_type VARCHAR(20) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    reference_type VARCHAR(50),
    reference_id INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create gst_slabs table
CREATE TABLE IF NOT EXISTS gst_slabs (
    id SERIAL PRIMARY KEY,
    account_id VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    rate DECIMAL(5, 2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create credits table
CREATE TABLE IF NOT EXISTS credits (
    id SERIAL PRIMARY KEY,
    account_id VARCHAR(100) NOT NULL,
    credit_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id),
    credit_date DATE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create credit_payments table
CREATE TABLE IF NOT EXISTS credit_payments (
    id SERIAL PRIMARY KEY,
    credit_id INTEGER NOT NULL REFERENCES credits(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sales_returns table
CREATE TABLE IF NOT EXISTS sales_returns (
    id SERIAL PRIMARY KEY,
    account_id VARCHAR(100) NOT NULL,
    return_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id),
    invoice_id INTEGER REFERENCES invoices(id),
    return_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    subtotal DECIMAL(12, 2) NOT NULL,
    tax_amount DECIMAL(12, 2) DEFAULT 0.00,
    total_amount DECIMAL(12, 2) NOT NULL,
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sales_return_items table
CREATE TABLE IF NOT EXISTS sales_return_items (
    id SERIAL PRIMARY KEY,
    return_id INTEGER NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES items(id),
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL
);

-- Create shipments table
CREATE TABLE IF NOT EXISTS shipments (
    id SERIAL PRIMARY KEY,
    account_id VARCHAR(100) NOT NULL,
    shipment_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_id INTEGER REFERENCES invoices(id),
    customer_id INTEGER REFERENCES customers(id),
    shipment_date DATE NOT NULL,
    delivery_date DATE,
    status VARCHAR(20) DEFAULT 'pending',
    tracking_number VARCHAR(100),
    carrier VARCHAR(100),
    shipping_address TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create shipment_items table
CREATE TABLE IF NOT EXISTS shipment_items (
    id SERIAL PRIMARY KEY,
    shipment_id INTEGER NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES items(id),
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_account_id ON customers(account_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_vendors_account_id ON vendors(account_id);
CREATE INDEX IF NOT EXISTS idx_items_account_id ON items(account_id);
CREATE INDEX IF NOT EXISTS idx_items_code ON items(item_code);
CREATE INDEX IF NOT EXISTS idx_invoices_account_id ON invoices(account_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_account_id ON payments(account_id);
CREATE INDEX IF NOT EXISTS idx_purchases_account_id ON purchases(account_id);
CREATE INDEX IF NOT EXISTS idx_inventory_account_id ON inventory(account_id);
CREATE INDEX IF NOT EXISTS idx_inventory_item ON inventory(item_id);

-- Grant all permissions to bai_user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO bai_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO bai_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO bai_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO bai_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO bai_user;
"@

# Execute the SQL commands
try {
    Write-Host "Executing SQL commands..." -ForegroundColor Yellow
    $sql | & $PGBIN -U $PGUSER -h $PGHOST -d $DATABASE
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ All tables created successfully!" -ForegroundColor Green
        
        # List all tables to verify
        Write-Host "`nListing all tables in the database:" -ForegroundColor Cyan
        $listTablesSQL = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
        $listTablesSQL | & $PGBIN -U $PGUSER -h $PGHOST -d $DATABASE
    } else {
        Write-Host "❌ Error creating tables. Exit code: $LASTEXITCODE" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error executing SQL commands: $_" -ForegroundColor Red
}

Write-Host "`nDatabase setup completed!" -ForegroundColor Green
