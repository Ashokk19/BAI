"""
Setup Sales Returns Table
Creates the sales_returns table in PostgreSQL database
"""

import sys
import os

# Add backend directory to path
backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_dir)

from database.postgres_db import postgres_db

def setup_sales_returns_table():
    """Create sales_returns table if it doesn't exist"""
    
    create_table_sql = """
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
        status VARCHAR(50) DEFAULT 'pending',
        refund_status VARCHAR(50) DEFAULT 'pending',
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

    COMMENT ON TABLE sales_returns IS 'Stores sales return records with refund information';
    """
    
    try:
        print("Connecting to PostgreSQL database...")
        with postgres_db.get_connection() as conn:
            print("Creating sales_returns table...")
            with conn.cursor() as cur:
                cur.execute(create_table_sql)
                conn.commit()
            
            print("✅ Sales returns table created successfully!")
            
            # Verify table exists
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_name = 'sales_returns'
                    ORDER BY ordinal_position
                """)
                columns = cur.fetchall()
                
                print("\n📋 Table structure:")
                for col in columns:
                    nullable = "NULL" if col[2] == 'YES' else "NOT NULL"
                    print(f"  - {col[0]}: {col[1]} ({nullable})")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = setup_sales_returns_table()
    sys.exit(0 if success else 1)
