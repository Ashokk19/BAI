-- Create ENUM types
CREATE TYPE userrole AS ENUM ('ADMIN', 'MANAGER', 'STAFF', 'CUSTOMER');
CREATE TYPE customertype AS ENUM ('individual', 'business');

-- Create tables
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role USERROLE DEFAULT 'STAFF'::userrole,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
    customer_type CUSTOMERTYPE DEFAULT 'individual'::customertype,
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
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customers_account_id ON customers(account_id);
CREATE INDEX IF NOT EXISTS idx_items_account_id ON items(account_id);
CREATE INDEX IF NOT EXISTS idx_invoices_account_id ON invoices(account_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO bai_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO bai_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO bai_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO bai_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO bai_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO bai_user;
