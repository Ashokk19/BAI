"""Setup script to create payments table in PostgreSQL database."""

import psycopg2
from psycopg2.extras import RealDictCursor

# Database connection parameters from settings
DB_CONFIG = {
    "host": "aws-1-ap-south-1.pooler.supabase.com",
    "database": "postgres",
    "user": "postgres.jcuupuwxfmdhpfwjemou",
    "password": "postgres",
    "port": 5432,
    "sslmode": "require"
}

def create_payments_table():
    """Create payments table if it doesn't exist."""
    
    create_table_sql = """
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
        PRIMARY KEY (account_id, id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_payments_account_id ON payments(account_id);
    CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(account_id, invoice_id);
    CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(account_id, customer_id);
    CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(account_id, payment_date DESC);
    """
    
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Check if table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'payments'
            );
        """)
        exists = cursor.fetchone()['exists']
        
        if exists:
            print("✅ Payments table already exists")
        else:
            print("📋 Creating payments table...")
            cursor.execute(create_table_sql)
            conn.commit()
            print("✅ Payments table created successfully")
        
        # Show table info
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'payments'
            ORDER BY ordinal_position;
        """)
        columns = cursor.fetchall()
        print("\n📊 Payments table structure:")
        for col in columns:
            print(f"  - {col['column_name']}: {col['data_type']} (nullable: {col['is_nullable']})")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🔧 Setting up payments table...\n")
    create_payments_table()
