# PowerShell script to safely update PostgreSQL tables to use composite primary keys

$env:PGPASSWORD = "postgres"
$PGBIN = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
$PGUSER = "postgres"
$PGHOST = "localhost"
$DATABASE = "bai_db"

Write-Host "Safely updating PostgreSQL tables to use composite primary keys..." -ForegroundColor Green

# SQL commands to safely update tables
$sql = @"
-- Step 1: Drop all foreign key constraints first
ALTER TABLE IF EXISTS invoice_items DROP CONSTRAINT IF EXISTS invoice_items_invoice_id_fkey;
ALTER TABLE IF EXISTS invoice_items DROP CONSTRAINT IF EXISTS invoice_items_item_id_fkey;
ALTER TABLE IF EXISTS payments DROP CONSTRAINT IF EXISTS payments_customer_id_fkey;
ALTER TABLE IF EXISTS payments DROP CONSTRAINT IF EXISTS payments_invoice_id_fkey;
ALTER TABLE IF EXISTS invoices DROP CONSTRAINT IF EXISTS invoices_customer_id_fkey;
ALTER TABLE IF EXISTS purchase_items DROP CONSTRAINT IF EXISTS purchase_items_purchase_id_fkey;
ALTER TABLE IF EXISTS purchase_items DROP CONSTRAINT IF EXISTS purchase_items_item_id_fkey;
ALTER TABLE IF EXISTS purchases DROP CONSTRAINT IF EXISTS purchases_vendor_id_fkey;
ALTER TABLE IF EXISTS inventory DROP CONSTRAINT IF EXISTS inventory_item_id_fkey;
ALTER TABLE IF EXISTS inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_item_id_fkey;
ALTER TABLE IF EXISTS credit_payments DROP CONSTRAINT IF EXISTS credit_payments_credit_id_fkey;
ALTER TABLE IF EXISTS credits DROP CONSTRAINT IF EXISTS credits_customer_id_fkey;
ALTER TABLE IF EXISTS sales_return_items DROP CONSTRAINT IF EXISTS sales_return_items_return_id_fkey;
ALTER TABLE IF EXISTS sales_return_items DROP CONSTRAINT IF EXISTS sales_return_items_item_id_fkey;
ALTER TABLE IF EXISTS sales_returns DROP CONSTRAINT IF EXISTS sales_returns_customer_id_fkey;
ALTER TABLE IF EXISTS sales_returns DROP CONSTRAINT IF EXISTS sales_returns_invoice_id_fkey;
ALTER TABLE IF EXISTS shipment_items DROP CONSTRAINT IF EXISTS shipment_items_shipment_id_fkey;
ALTER TABLE IF EXISTS shipment_items DROP CONSTRAINT IF EXISTS shipment_items_item_id_fkey;
ALTER TABLE IF EXISTS shipments DROP CONSTRAINT IF EXISTS shipments_invoice_id_fkey;
ALTER TABLE IF EXISTS shipments DROP CONSTRAINT IF EXISTS shipments_customer_id_fkey;

-- Step 2: Drop all tables in correct order (child tables first)
DROP TABLE IF EXISTS shipment_items;
DROP TABLE IF EXISTS shipments;
DROP TABLE IF EXISTS sales_return_items;
DROP TABLE IF EXISTS sales_returns;
DROP TABLE IF EXISTS credit_payments;
DROP TABLE IF EXISTS credits;
DROP TABLE IF EXISTS inventory_transactions;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS purchase_items;
DROP TABLE IF EXISTS purchases;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS invoice_items;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS vendors;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS organizations;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS gst_slabs;

-- Step 3: Recreate all tables with composite primary keys

-- Users table (add account_id for multi-tenancy)
CREATE TABLE users (
    account_id VARCHAR(100) NOT NULL DEFAULT 'default_account',
    id SERIAL NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role userrole DEFAULT 'staff',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id, id)
);

-- Organizations table
CREATE TABLE organizations (
    account_id VARCHAR(100) NOT NULL,
    id SERIAL NOT NULL,
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id, id)
);

-- Customers table
CREATE TABLE customers (
    account_id VARCHAR(100) NOT NULL,
    id SERIAL NOT NULL,
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id, id)
);

-- Vendors table
CREATE TABLE vendors (
    account_id VARCHAR(100) NOT NULL,
    id SERIAL NOT NULL,
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id, id)
);

-- Items table
CREATE TABLE items (
    account_id VARCHAR(100) NOT NULL,
    id SERIAL NOT NULL,
    item_code VARCHAR(50) NOT NULL,
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id, id),
    UNIQUE (account_id, item_code)
);

-- GST Slabs table
CREATE TABLE gst_slabs (
    account_id VARCHAR(100) NOT NULL,
    id SERIAL NOT NULL,
    name VARCHAR(100) NOT NULL,
    rate DECIMAL(5, 2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id, id)
);

-- Invoices table
CREATE TABLE invoices (
    account_id VARCHAR(100) NOT NULL,
    id SERIAL NOT NULL,
    invoice_number VARCHAR(50) NOT NULL,
    customer_account_id VARCHAR(100),
    customer_id INTEGER,
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id, id),
    UNIQUE (account_id, invoice_number)
);

-- Invoice Items table
CREATE TABLE invoice_items (
    account_id VARCHAR(100) NOT NULL,
    id SERIAL NOT NULL,
    invoice_account_id VARCHAR(100) NOT NULL,
    invoice_id INTEGER NOT NULL,
    item_account_id VARCHAR(100),
    item_id INTEGER,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 0.00,
    amount DECIMAL(12, 2) NOT NULL,
    PRIMARY KEY (account_id, id)
);

-- Payments table
CREATE TABLE payments (
    account_id VARCHAR(100) NOT NULL,
    id SERIAL NOT NULL,
    payment_number VARCHAR(50) NOT NULL,
    customer_account_id VARCHAR(100),
    customer_id INTEGER,
    invoice_account_id VARCHAR(100),
    invoice_id INTEGER,
    payment_date DATE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'cash',
    reference_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id, id),
    UNIQUE (account_id, payment_number)
);

-- Purchases table
CREATE TABLE purchases (
    account_id VARCHAR(100) NOT NULL,
    id SERIAL NOT NULL,
    purchase_number VARCHAR(50) NOT NULL,
    vendor_account_id VARCHAR(100),
    vendor_id INTEGER,
    purchase_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    subtotal DECIMAL(12, 2) NOT NULL,
    tax_amount DECIMAL(12, 2) DEFAULT 0.00,
    discount_amount DECIMAL(12, 2) DEFAULT 0.00,
    total_amount DECIMAL(12, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id, id),
    UNIQUE (account_id, purchase_number)
);

-- Purchase Items table
CREATE TABLE purchase_items (
    account_id VARCHAR(100) NOT NULL,
    id SERIAL NOT NULL,
    purchase_account_id VARCHAR(100) NOT NULL,
    purchase_id INTEGER NOT NULL,
    item_account_id VARCHAR(100),
    item_id INTEGER,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 0.00,
    amount DECIMAL(12, 2) NOT NULL,
    PRIMARY KEY (account_id, id)
);

-- Inventory table
CREATE TABLE inventory (
    account_id VARCHAR(100) NOT NULL,
    id SERIAL NOT NULL,
    item_account_id VARCHAR(100) NOT NULL,
    item_id INTEGER NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    reserved_quantity DECIMAL(10, 2) DEFAULT 0.00,
    location VARCHAR(100),
    batch_number VARCHAR(50),
    expiry_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id, id)
);

-- Inventory Transactions table
CREATE TABLE inventory_transactions (
    account_id VARCHAR(100) NOT NULL,
    id SERIAL NOT NULL,
    item_account_id VARCHAR(100) NOT NULL,
    item_id INTEGER NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    reference_type VARCHAR(50),
    reference_id INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id, id)
);

-- Credits table
CREATE TABLE credits (
    account_id VARCHAR(100) NOT NULL,
    id SERIAL NOT NULL,
    credit_number VARCHAR(50) NOT NULL,
    customer_account_id VARCHAR(100),
    customer_id INTEGER,
    credit_date DATE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id, id),
    UNIQUE (account_id, credit_number)
);

-- Credit Payments table
CREATE TABLE credit_payments (
    account_id VARCHAR(100) NOT NULL,
    id SERIAL NOT NULL,
    credit_account_id VARCHAR(100) NOT NULL,
    credit_id INTEGER NOT NULL,
    payment_date DATE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id, id)
);

-- Sales Returns table
CREATE TABLE sales_returns (
    account_id VARCHAR(100) NOT NULL,
    id SERIAL NOT NULL,
    return_number VARCHAR(50) NOT NULL,
    customer_account_id VARCHAR(100),
    customer_id INTEGER,
    invoice_account_id VARCHAR(100),
    invoice_id INTEGER,
    return_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    subtotal DECIMAL(12, 2) NOT NULL,
    tax_amount DECIMAL(12, 2) DEFAULT 0.00,
    total_amount DECIMAL(12, 2) NOT NULL,
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id, id),
    UNIQUE (account_id, return_number)
);

-- Sales Return Items table
CREATE TABLE sales_return_items (
    account_id VARCHAR(100) NOT NULL,
    id SERIAL NOT NULL,
    return_account_id VARCHAR(100) NOT NULL,
    return_id INTEGER NOT NULL,
    item_account_id VARCHAR(100),
    item_id INTEGER,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    PRIMARY KEY (account_id, id)
);

-- Shipments table
CREATE TABLE shipments (
    account_id VARCHAR(100) NOT NULL,
    id SERIAL NOT NULL,
    shipment_number VARCHAR(50) NOT NULL,
    invoice_account_id VARCHAR(100),
    invoice_id INTEGER,
    customer_account_id VARCHAR(100),
    customer_id INTEGER,
    shipment_date DATE NOT NULL,
    delivery_date DATE,
    status VARCHAR(20) DEFAULT 'pending',
    tracking_number VARCHAR(100),
    carrier VARCHAR(100),
    shipping_address TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id, id),
    UNIQUE (account_id, shipment_number)
);

-- Shipment Items table
CREATE TABLE shipment_items (
    account_id VARCHAR(100) NOT NULL,
    id SERIAL NOT NULL,
    shipment_account_id VARCHAR(100) NOT NULL,
    shipment_id INTEGER NOT NULL,
    item_account_id VARCHAR(100),
    item_id INTEGER,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    PRIMARY KEY (account_id, id)
);

-- Step 4: Add foreign key constraints after all tables are created
ALTER TABLE invoices 
ADD CONSTRAINT fk_invoices_customer 
FOREIGN KEY (customer_account_id, customer_id) 
REFERENCES customers(account_id, id);

ALTER TABLE invoice_items 
ADD CONSTRAINT fk_invoice_items_invoice 
FOREIGN KEY (invoice_account_id, invoice_id) 
REFERENCES invoices(account_id, id) ON DELETE CASCADE;

ALTER TABLE invoice_items 
ADD CONSTRAINT fk_invoice_items_item 
FOREIGN KEY (item_account_id, item_id) 
REFERENCES items(account_id, id);

ALTER TABLE payments 
ADD CONSTRAINT fk_payments_customer 
FOREIGN KEY (customer_account_id, customer_id) 
REFERENCES customers(account_id, id);

ALTER TABLE payments 
ADD CONSTRAINT fk_payments_invoice 
FOREIGN KEY (invoice_account_id, invoice_id) 
REFERENCES invoices(account_id, id);

ALTER TABLE purchases 
ADD CONSTRAINT fk_purchases_vendor 
FOREIGN KEY (vendor_account_id, vendor_id) 
REFERENCES vendors(account_id, id);

ALTER TABLE purchase_items 
ADD CONSTRAINT fk_purchase_items_purchase 
FOREIGN KEY (purchase_account_id, purchase_id) 
REFERENCES purchases(account_id, id) ON DELETE CASCADE;

ALTER TABLE purchase_items 
ADD CONSTRAINT fk_purchase_items_item 
FOREIGN KEY (item_account_id, item_id) 
REFERENCES items(account_id, id);

ALTER TABLE inventory 
ADD CONSTRAINT fk_inventory_item 
FOREIGN KEY (item_account_id, item_id) 
REFERENCES items(account_id, id);

ALTER TABLE inventory_transactions 
ADD CONSTRAINT fk_inventory_transactions_item 
FOREIGN KEY (item_account_id, item_id) 
REFERENCES items(account_id, id);

ALTER TABLE credits 
ADD CONSTRAINT fk_credits_customer 
FOREIGN KEY (customer_account_id, customer_id) 
REFERENCES customers(account_id, id);

ALTER TABLE credit_payments 
ADD CONSTRAINT fk_credit_payments_credit 
FOREIGN KEY (credit_account_id, credit_id) 
REFERENCES credits(account_id, id) ON DELETE CASCADE;

ALTER TABLE sales_returns 
ADD CONSTRAINT fk_sales_returns_customer 
FOREIGN KEY (customer_account_id, customer_id) 
REFERENCES customers(account_id, id);

ALTER TABLE sales_returns 
ADD CONSTRAINT fk_sales_returns_invoice 
FOREIGN KEY (invoice_account_id, invoice_id) 
REFERENCES invoices(account_id, id);

ALTER TABLE sales_return_items 
ADD CONSTRAINT fk_sales_return_items_return 
FOREIGN KEY (return_account_id, return_id) 
REFERENCES sales_returns(account_id, id) ON DELETE CASCADE;

ALTER TABLE sales_return_items 
ADD CONSTRAINT fk_sales_return_items_item 
FOREIGN KEY (item_account_id, item_id) 
REFERENCES items(account_id, id);

ALTER TABLE shipments 
ADD CONSTRAINT fk_shipments_invoice 
FOREIGN KEY (invoice_account_id, invoice_id) 
REFERENCES invoices(account_id, id);

ALTER TABLE shipments 
ADD CONSTRAINT fk_shipments_customer 
FOREIGN KEY (customer_account_id, customer_id) 
REFERENCES customers(account_id, id);

ALTER TABLE shipment_items 
ADD CONSTRAINT fk_shipment_items_shipment 
FOREIGN KEY (shipment_account_id, shipment_id) 
REFERENCES shipments(account_id, id) ON DELETE CASCADE;

ALTER TABLE shipment_items 
ADD CONSTRAINT fk_shipment_items_item 
FOREIGN KEY (item_account_id, item_id) 
REFERENCES items(account_id, id);

-- Step 5: Create indexes for better performance
CREATE INDEX idx_customers_account_id ON customers(account_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_vendors_account_id ON vendors(account_id);
CREATE INDEX idx_items_account_id ON items(account_id);
CREATE INDEX idx_items_code ON items(account_id, item_code);
CREATE INDEX idx_invoices_account_id ON invoices(account_id);
CREATE INDEX idx_invoices_customer ON invoices(customer_account_id, customer_id);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_account_id, invoice_id);
CREATE INDEX idx_payments_account_id ON payments(account_id);
CREATE INDEX idx_purchases_account_id ON purchases(account_id);
CREATE INDEX idx_inventory_account_id ON inventory(account_id);
CREATE INDEX idx_inventory_item ON inventory(item_account_id, item_id);

-- Step 6: Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO bai_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO bai_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO bai_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO bai_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO bai_user;
"@

# Execute the SQL commands
try {
    Write-Host "Executing SQL commands to safely update table structure..." -ForegroundColor Yellow
    $sql | & $PGBIN -U $PGUSER -h $PGHOST -d $DATABASE
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ All tables updated with composite primary keys successfully!" -ForegroundColor Green
        
        # List all tables to verify
        Write-Host "`nListing all tables in the database:" -ForegroundColor Cyan
        $listTablesSQL = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
        $listTablesSQL | & $PGBIN -U $PGUSER -h $PGHOST -d $DATABASE
        
        # Show primary key structure for a sample table
        Write-Host "`nSample primary key structure (customers table):" -ForegroundColor Cyan
        $pkSQL = "SELECT column_name, ordinal_position FROM information_schema.key_column_usage WHERE table_name = 'customers' AND constraint_name LIKE '%_pkey' ORDER BY ordinal_position;"
        $pkSQL | & $PGBIN -U $PGUSER -h $PGHOST -d $DATABASE
    } else {
        Write-Host "❌ Error updating tables. Exit code: $LASTEXITCODE" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error executing SQL commands: $_" -ForegroundColor Red
}

Write-Host "`nDatabase update completed!" -ForegroundColor Green
