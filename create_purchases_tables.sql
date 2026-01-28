-- Purchases Module Database Tables
-- All tables include account_id as part of composite primary key

-- 1. Vendors Table
CREATE TABLE IF NOT EXISTS vendors (
    id BIGSERIAL NOT NULL,
    account_id VARCHAR(100) NOT NULL,
    vendor_code VARCHAR(50) NOT NULL,
    vendor_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    mobile VARCHAR(20),
    website VARCHAR(200),
    gst_number VARCHAR(50),
    pan_number VARCHAR(50),
    billing_address TEXT,
    shipping_address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    postal_code VARCHAR(20),
    payment_terms VARCHAR(100),
    credit_limit NUMERIC(15,2) DEFAULT 0.00,
    opening_balance NUMERIC(15,2) DEFAULT 0.00,
    current_balance NUMERIC(15,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    PRIMARY KEY (account_id, id),
    UNIQUE (account_id, vendor_code)
);

CREATE INDEX idx_vendors_name ON vendors(account_id, vendor_name);
CREATE INDEX idx_vendors_active ON vendors(account_id, is_active);

-- 2. Purchase Orders Table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id BIGSERIAL NOT NULL,
    account_id VARCHAR(100) NOT NULL,
    po_number VARCHAR(50) NOT NULL,
    vendor_id BIGINT NOT NULL,
    po_date DATE NOT NULL,
    expected_delivery_date DATE,
    reference_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'draft', -- draft, sent, confirmed, partially_received, received, cancelled
    subtotal NUMERIC(15,2) DEFAULT 0.00,
    tax_amount NUMERIC(15,2) DEFAULT 0.00,
    discount_amount NUMERIC(15,2) DEFAULT 0.00,
    shipping_charges NUMERIC(15,2) DEFAULT 0.00,
    total_amount NUMERIC(15,2) NOT NULL,
    notes TEXT,
    terms_and_conditions TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    PRIMARY KEY (account_id, id),
    UNIQUE (account_id, po_number),
    FOREIGN KEY (account_id, vendor_id) REFERENCES vendors(account_id, id) ON DELETE RESTRICT
);

CREATE INDEX idx_po_vendor ON purchase_orders(account_id, vendor_id);
CREATE INDEX idx_po_date ON purchase_orders(account_id, po_date);
CREATE INDEX idx_po_status ON purchase_orders(account_id, status);

-- 3. Purchase Order Items Table
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id BIGSERIAL NOT NULL,
    account_id VARCHAR(100) NOT NULL,
    po_id BIGINT NOT NULL,
    item_id BIGINT NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity NUMERIC(10,3) NOT NULL,
    unit_price NUMERIC(15,2) NOT NULL,
    tax_rate NUMERIC(5,2) DEFAULT 0.00,
    tax_amount NUMERIC(15,2) DEFAULT 0.00,
    discount_percentage NUMERIC(5,2) DEFAULT 0.00,
    discount_amount NUMERIC(15,2) DEFAULT 0.00,
    line_total NUMERIC(15,2) NOT NULL,
    received_quantity NUMERIC(10,3) DEFAULT 0.00,
    PRIMARY KEY (account_id, id),
    FOREIGN KEY (account_id, po_id) REFERENCES purchase_orders(account_id, id) ON DELETE CASCADE,
    FOREIGN KEY (account_id, item_id) REFERENCES items(account_id, id) ON DELETE RESTRICT
);

CREATE INDEX idx_po_items_po ON purchase_order_items(account_id, po_id);

-- 4. Purchase Receipts Table (Goods Receipt Note - GRN)
CREATE TABLE IF NOT EXISTS purchase_receipts (
    id BIGSERIAL NOT NULL,
    account_id VARCHAR(100) NOT NULL,
    receipt_number VARCHAR(50) NOT NULL,
    po_id BIGINT,
    vendor_id BIGINT NOT NULL,
    receipt_date DATE NOT NULL,
    reference_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'received', -- received, inspected, accepted, rejected
    notes TEXT,
    received_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    PRIMARY KEY (account_id, id),
    UNIQUE (account_id, receipt_number),
    FOREIGN KEY (account_id, po_id) REFERENCES purchase_orders(account_id, id) ON DELETE SET NULL,
    FOREIGN KEY (account_id, vendor_id) REFERENCES vendors(account_id, id) ON DELETE RESTRICT
);

CREATE INDEX idx_receipt_vendor ON purchase_receipts(account_id, vendor_id);
CREATE INDEX idx_receipt_po ON purchase_receipts(account_id, po_id);
CREATE INDEX idx_receipt_date ON purchase_receipts(account_id, receipt_date);

-- 5. Purchase Receipt Items Table
CREATE TABLE IF NOT EXISTS purchase_receipt_items (
    id BIGSERIAL NOT NULL,
    account_id VARCHAR(100) NOT NULL,
    receipt_id BIGINT NOT NULL,
    po_item_id BIGINT,
    item_id BIGINT NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    quantity_received NUMERIC(10,3) NOT NULL,
    quantity_accepted NUMERIC(10,3) DEFAULT 0.00,
    quantity_rejected NUMERIC(10,3) DEFAULT 0.00,
    unit_price NUMERIC(15,2),
    notes TEXT,
    PRIMARY KEY (account_id, id),
    FOREIGN KEY (account_id, receipt_id) REFERENCES purchase_receipts(account_id, id) ON DELETE CASCADE,
    FOREIGN KEY (account_id, item_id) REFERENCES items(account_id, id) ON DELETE RESTRICT
);

CREATE INDEX idx_receipt_items_receipt ON purchase_receipt_items(account_id, receipt_id);

-- 6. Bills Table (Vendor Invoices)
CREATE TABLE IF NOT EXISTS bills (
    id BIGSERIAL NOT NULL,
    account_id VARCHAR(100) NOT NULL,
    bill_number VARCHAR(50) NOT NULL,
    vendor_id BIGINT NOT NULL,
    vendor_invoice_number VARCHAR(100),
    po_id BIGINT,
    receipt_id BIGINT,
    bill_date DATE NOT NULL,
    due_date DATE NOT NULL,
    payment_terms VARCHAR(100),
    status VARCHAR(50) DEFAULT 'unpaid', -- unpaid, partially_paid, paid, overdue, cancelled
    subtotal NUMERIC(15,2) DEFAULT 0.00,
    tax_amount NUMERIC(15,2) DEFAULT 0.00,
    discount_amount NUMERIC(15,2) DEFAULT 0.00,
    adjustment_amount NUMERIC(15,2) DEFAULT 0.00,
    total_amount NUMERIC(15,2) NOT NULL,
    paid_amount NUMERIC(15,2) DEFAULT 0.00,
    balance_due NUMERIC(15,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    PRIMARY KEY (account_id, id),
    UNIQUE (account_id, bill_number),
    FOREIGN KEY (account_id, vendor_id) REFERENCES vendors(account_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (account_id, po_id) REFERENCES purchase_orders(account_id, id) ON DELETE SET NULL,
    FOREIGN KEY (account_id, receipt_id) REFERENCES purchase_receipts(account_id, id) ON DELETE SET NULL
);

CREATE INDEX idx_bills_vendor ON bills(account_id, vendor_id);
CREATE INDEX idx_bills_date ON bills(account_id, bill_date);
CREATE INDEX idx_bills_status ON bills(account_id, status);
CREATE INDEX idx_bills_due_date ON bills(account_id, due_date);

-- 7. Bill Items Table
CREATE TABLE IF NOT EXISTS bill_items (
    id BIGSERIAL NOT NULL,
    account_id VARCHAR(100) NOT NULL,
    bill_id BIGINT NOT NULL,
    item_id BIGINT,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity NUMERIC(10,3) NOT NULL,
    unit_price NUMERIC(15,2) NOT NULL,
    tax_rate NUMERIC(5,2) DEFAULT 0.00,
    tax_amount NUMERIC(15,2) DEFAULT 0.00,
    discount_amount NUMERIC(15,2) DEFAULT 0.00,
    line_total NUMERIC(15,2) NOT NULL,
    PRIMARY KEY (account_id, id),
    FOREIGN KEY (account_id, bill_id) REFERENCES bills(account_id, id) ON DELETE CASCADE,
    FOREIGN KEY (account_id, item_id) REFERENCES items(account_id, id) ON DELETE SET NULL
);

CREATE INDEX idx_bill_items_bill ON bill_items(account_id, bill_id);

-- 8. Vendor Payments Table
CREATE TABLE IF NOT EXISTS vendor_payments (
    id BIGSERIAL NOT NULL,
    account_id VARCHAR(100) NOT NULL,
    payment_number VARCHAR(50) NOT NULL,
    vendor_id BIGINT NOT NULL,
    payment_date DATE NOT NULL,
    payment_mode VARCHAR(50) DEFAULT 'cash', -- cash, cheque, bank_transfer, card, upi, other
    reference_number VARCHAR(100),
    amount NUMERIC(15,2) NOT NULL,
    bank_charges NUMERIC(15,2) DEFAULT 0.00,
    tds_amount NUMERIC(15,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    PRIMARY KEY (account_id, id),
    UNIQUE (account_id, payment_number),
    FOREIGN KEY (account_id, vendor_id) REFERENCES vendors(account_id, id) ON DELETE RESTRICT
);

CREATE INDEX idx_vendor_payments_vendor ON vendor_payments(account_id, vendor_id);
CREATE INDEX idx_vendor_payments_date ON vendor_payments(account_id, payment_date);

-- 9. Vendor Payment Allocations Table (linking payments to bills)
CREATE TABLE IF NOT EXISTS vendor_payment_allocations (
    id BIGSERIAL NOT NULL,
    account_id VARCHAR(100) NOT NULL,
    payment_id BIGINT NOT NULL,
    bill_id BIGINT NOT NULL,
    amount_allocated NUMERIC(15,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (account_id, id),
    FOREIGN KEY (account_id, payment_id) REFERENCES vendor_payments(account_id, id) ON DELETE CASCADE,
    FOREIGN KEY (account_id, bill_id) REFERENCES bills(account_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_vendor_payment_alloc_payment ON vendor_payment_allocations(account_id, payment_id);
CREATE INDEX idx_vendor_payment_alloc_bill ON vendor_payment_allocations(account_id, bill_id);

-- 10. Vendor Credits Table (Credit Notes from vendors)
CREATE TABLE IF NOT EXISTS vendor_credits (
    id BIGSERIAL NOT NULL,
    account_id VARCHAR(100) NOT NULL,
    credit_note_number VARCHAR(50) NOT NULL,
    vendor_id BIGINT NOT NULL,
    bill_id BIGINT,
    credit_date DATE NOT NULL,
    reason VARCHAR(255),
    status VARCHAR(50) DEFAULT 'open', -- open, applied, closed
    credit_amount NUMERIC(15,2) NOT NULL,
    used_amount NUMERIC(15,2) DEFAULT 0.00,
    balance_amount NUMERIC(15,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    PRIMARY KEY (account_id, id),
    UNIQUE (account_id, credit_note_number),
    FOREIGN KEY (account_id, vendor_id) REFERENCES vendors(account_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (account_id, bill_id) REFERENCES bills(account_id, id) ON DELETE SET NULL
);

CREATE INDEX idx_vendor_credits_vendor ON vendor_credits(account_id, vendor_id);
CREATE INDEX idx_vendor_credits_date ON vendor_credits(account_id, credit_date);
CREATE INDEX idx_vendor_credits_status ON vendor_credits(account_id, status);

-- 11. Vendor Credit Allocations Table (linking credits to bills)
CREATE TABLE IF NOT EXISTS vendor_credit_allocations (
    id BIGSERIAL NOT NULL,
    account_id VARCHAR(100) NOT NULL,
    credit_id BIGINT NOT NULL,
    bill_id BIGINT NOT NULL,
    amount_allocated NUMERIC(15,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (account_id, id),
    FOREIGN KEY (account_id, credit_id) REFERENCES vendor_credits(account_id, id) ON DELETE CASCADE,
    FOREIGN KEY (account_id, bill_id) REFERENCES bills(account_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_vendor_credit_alloc_credit ON vendor_credit_allocations(account_id, credit_id);
CREATE INDEX idx_vendor_credit_alloc_bill ON vendor_credit_allocations(account_id, bill_id);

-- Comments for documentation
COMMENT ON TABLE vendors IS 'Stores vendor/supplier information';
COMMENT ON TABLE purchase_orders IS 'Purchase orders sent to vendors';
COMMENT ON TABLE purchase_order_items IS 'Line items in purchase orders';
COMMENT ON TABLE purchase_receipts IS 'Goods receipt notes for received items';
COMMENT ON TABLE purchase_receipt_items IS 'Items received in each receipt';
COMMENT ON TABLE bills IS 'Vendor invoices/bills to be paid';
COMMENT ON TABLE bill_items IS 'Line items in vendor bills';
COMMENT ON TABLE vendor_payments IS 'Payments made to vendors';
COMMENT ON TABLE vendor_payment_allocations IS 'Links payments to specific bills';
COMMENT ON TABLE vendor_credits IS 'Credit notes received from vendors';
COMMENT ON TABLE vendor_credit_allocations IS 'Links credit notes to bills';
