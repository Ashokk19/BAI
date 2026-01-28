-- SQL script to create necessary tables for the invoice and payment system
-- Run this in your PostgreSQL database

-- =====================================================
-- INVOICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS invoices (
    account_id VARCHAR(50) NOT NULL,
    id SERIAL NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE,
    customer_id INTEGER NOT NULL,
    customer_name VARCHAR(255),
    customer_address TEXT,
    customer_gstin VARCHAR(50),
    customer_state VARCHAR(100),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    company_name VARCHAR(255),
    company_address TEXT,
    company_gstin VARCHAR(50),
    company_state VARCHAR(100),
    company_email VARCHAR(255),
    company_phone VARCHAR(50),
    subtotal DECIMAL(15, 2) DEFAULT 0.00,
    total_cgst DECIMAL(15, 2) DEFAULT 0.00,
    total_sgst DECIMAL(15, 2) DEFAULT 0.00,
    total_igst DECIMAL(15, 2) DEFAULT 0.00,
    total_tax DECIMAL(15, 2) DEFAULT 0.00,
    total_amount DECIMAL(15, 2) DEFAULT 0.00,
    paid_amount DECIMAL(15, 2) DEFAULT 0.00,
    balance_due DECIMAL(15, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'draft',
    notes TEXT,
    terms TEXT,
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id, id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_invoices_account_id ON invoices(account_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(account_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(account_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(account_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(account_id, invoice_date DESC);

-- =====================================================
-- INVOICE ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS invoice_items (
    account_id VARCHAR(50) NOT NULL,
    id SERIAL NOT NULL,
    invoice_id INTEGER NOT NULL,
    item_id INTEGER,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    hsn_code VARCHAR(50),
    quantity DECIMAL(15, 3) NOT NULL DEFAULT 1.000,
    unit VARCHAR(50) DEFAULT 'pcs',
    unit_price DECIMAL(15, 2) NOT NULL,
    discount_percentage DECIMAL(5, 2) DEFAULT 0.00,
    discount_amount DECIMAL(15, 2) DEFAULT 0.00,
    base_amount DECIMAL(15, 2) DEFAULT 0.00,
    gst_rate DECIMAL(5, 2) DEFAULT 0.00,
    cgst_rate DECIMAL(5, 2) DEFAULT 0.00,
    sgst_rate DECIMAL(5, 2) DEFAULT 0.00,
    igst_rate DECIMAL(5, 2) DEFAULT 0.00,
    cgst_amount DECIMAL(15, 2) DEFAULT 0.00,
    sgst_amount DECIMAL(15, 2) DEFAULT 0.00,
    igst_amount DECIMAL(15, 2) DEFAULT 0.00,
    tax_amount DECIMAL(15, 2) DEFAULT 0.00,
    line_total DECIMAL(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id, id),
    FOREIGN KEY (account_id, invoice_id) REFERENCES invoices(account_id, id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_invoice_items_account_id ON invoice_items(account_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(account_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_item_id ON invoice_items(account_id, item_id);

-- =====================================================
-- PAYMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
    account_id VARCHAR(50) NOT NULL,
    id SERIAL NOT NULL,
    payment_number VARCHAR(100) NOT NULL,
    payment_date DATE NOT NULL,
    payment_type VARCHAR(50) DEFAULT 'customer_payment',
    payment_direction VARCHAR(20) DEFAULT 'incoming',
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    payment_method VARCHAR(50),
    payment_status VARCHAR(50) DEFAULT 'completed',
    reference_number VARCHAR(100),
    notes TEXT,
    invoice_id INTEGER,
    customer_id INTEGER,
    recorded_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id, id),
    FOREIGN KEY (account_id, invoice_id) REFERENCES invoices(account_id, id) ON DELETE SET NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_payments_account_id ON payments(account_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(account_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(account_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(account_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_payment_number ON payments(account_id, payment_number);

-- =====================================================
-- SHIPMENTS TABLE (Stub - for future implementation)
-- =====================================================
CREATE TABLE IF NOT EXISTS shipments (
    account_id VARCHAR(50) NOT NULL,
    id SERIAL NOT NULL,
    shipment_number VARCHAR(100) NOT NULL,
    invoice_id INTEGER,
    shipment_date DATE NOT NULL,
    delivery_date DATE,
    carrier VARCHAR(255),
    tracking_number VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id, id),
    FOREIGN KEY (account_id, invoice_id) REFERENCES invoices(account_id, id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_shipments_account_id ON shipments(account_id);
CREATE INDEX IF NOT EXISTS idx_shipments_invoice_id ON shipments(account_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(account_id, status);

-- =====================================================
-- DELIVERY NOTES TABLE (Stub - for future implementation)
-- =====================================================
CREATE TABLE IF NOT EXISTS delivery_notes (
    account_id VARCHAR(50) NOT NULL,
    id SERIAL NOT NULL,
    delivery_note_number VARCHAR(100) NOT NULL,
    invoice_id INTEGER,
    shipment_id INTEGER,
    delivery_date DATE NOT NULL,
    recipient_name VARCHAR(255),
    recipient_signature TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id, id),
    FOREIGN KEY (account_id, invoice_id) REFERENCES invoices(account_id, id) ON DELETE SET NULL,
    FOREIGN KEY (account_id, shipment_id) REFERENCES shipments(account_id, id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_delivery_notes_account_id ON delivery_notes(account_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_invoice_id ON delivery_notes(account_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_shipment_id ON delivery_notes(account_id, shipment_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_status ON delivery_notes(account_id, status);

-- =====================================================
-- COMMENTS ON TABLES
-- =====================================================
-- =====================================================
-- SALES RETURNS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS sales_returns (
    account_id VARCHAR(50) NOT NULL,
    id SERIAL NOT NULL,
    return_number VARCHAR(100) NOT NULL,
    invoice_id INTEGER,
    customer_id INTEGER NOT NULL,
    return_date DATE NOT NULL,
    return_reason TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    refund_amount DECIMAL(15, 2) DEFAULT 0.00,
    refund_method VARCHAR(50),
    notes TEXT,
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id, id)
);

-- Create indexes for sales_returns
CREATE INDEX IF NOT EXISTS idx_sales_returns_account_id ON sales_returns(account_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_invoice_id ON sales_returns(account_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_customer_id ON sales_returns(account_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_return_number ON sales_returns(account_id, return_number);
CREATE INDEX IF NOT EXISTS idx_sales_returns_status ON sales_returns(account_id, status);
CREATE INDEX IF NOT EXISTS idx_sales_returns_date ON sales_returns(account_id, return_date DESC);

COMMENT ON TABLE invoices IS 'Stores sales invoices with composite primary key (account_id, id)';
COMMENT ON TABLE invoice_items IS 'Stores line items for invoices with GST calculations';
COMMENT ON TABLE payments IS 'Stores payment records linked to invoices';
COMMENT ON TABLE shipments IS 'Stores shipment information (stub implementation)';
COMMENT ON TABLE delivery_notes IS 'Stores delivery note records (stub implementation)';
COMMENT ON TABLE sales_returns IS 'Stores sales return records with refund information';

-- =====================================================
-- GRANTS (Optional - adjust based on your user setup)
-- =====================================================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON invoices TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON invoice_items TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON payments TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON shipments TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON delivery_notes TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
