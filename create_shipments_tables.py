"""Create shipments and delivery_notes tables."""
import sys
sys.path.insert(0, 'backend')

from database.postgres_db import postgres_db

create_shipments_sql = """
CREATE TABLE IF NOT EXISTS shipments (
    id SERIAL,
    account_id VARCHAR(255) NOT NULL,
    shipment_number VARCHAR(100) NOT NULL,
    invoice_id INTEGER NOT NULL,
    shipment_date DATE NOT NULL,
    carrier VARCHAR(255),
    tracking_number VARCHAR(255),
    shipping_method VARCHAR(100),
    expected_delivery DATE,
    actual_delivery DATE,
    status VARCHAR(50) DEFAULT 'pending',
    weight_kg DECIMAL(10, 2),
    shipping_cost DECIMAL(10, 2),
    shipping_address TEXT,
    package_count INTEGER DEFAULT 1,
    dimensions VARCHAR(100),
    insurance_cost DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id, id),
    FOREIGN KEY (account_id, invoice_id) REFERENCES invoices(account_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_shipments_account ON shipments(account_id);
CREATE INDEX IF NOT EXISTS idx_shipments_invoice ON shipments(account_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipments_date ON shipments(shipment_date);
"""

create_delivery_notes_sql = """
CREATE TABLE IF NOT EXISTS delivery_notes (
    id SERIAL,
    account_id VARCHAR(255) NOT NULL,
    delivery_note_number VARCHAR(100) NOT NULL,
    invoice_id INTEGER NOT NULL,
    shipment_id INTEGER,
    delivery_date DATE NOT NULL,
    received_by VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    signature_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id, id),
    FOREIGN KEY (account_id, invoice_id) REFERENCES invoices(account_id, id) ON DELETE CASCADE,
    FOREIGN KEY (account_id, shipment_id) REFERENCES shipments(account_id, id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_delivery_notes_account ON delivery_notes(account_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_invoice ON delivery_notes(account_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_shipment ON delivery_notes(account_id, shipment_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_date ON delivery_notes(delivery_date);
"""

try:
    with postgres_db.get_connection() as conn:
        cur = conn.cursor()
        
        print("Creating shipments table...")
        cur.execute(create_shipments_sql)
        print("✅ Shipments table created")
        
        print("\nCreating delivery_notes table...")
        cur.execute(create_delivery_notes_sql)
        print("✅ Delivery notes table created")
        
        conn.commit()
        
        # Verify
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema='public' AND table_name IN ('shipments', 'delivery_notes')
        """)
        tables = [row[0] for row in cur.fetchall()]
        print(f"\n📋 Tables: {tables}")
        
        cur.close()
    
    print("\n✅ Setup complete!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
