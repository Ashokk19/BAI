"""
Setup Credits Tables
Creates the customer_credits, credit_transactions, and credit_notes tables in PostgreSQL
"""

import sys
import os

# Add backend directory to path
backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_dir)

from database.postgres_db import postgres_db

def setup_credits_tables():
    """Create credits tables if they don't exist"""
    
    create_tables_sql = """
    -- =====================================================
    -- CUSTOMER CREDITS TABLE
    -- =====================================================
    CREATE TABLE IF NOT EXISTS customer_credits (
        account_id VARCHAR(50) NOT NULL,
        id SERIAL NOT NULL,
        credit_number VARCHAR(100) NOT NULL,
        credit_date TIMESTAMP NOT NULL,
        customer_id INTEGER NOT NULL,
        invoice_id INTEGER,
        sales_return_id INTEGER,
        credit_type VARCHAR(50) NOT NULL,
        credit_reason VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        original_amount DECIMAL(15, 2) NOT NULL,
        used_amount DECIMAL(15, 2) DEFAULT 0.00,
        remaining_amount DECIMAL(15, 2) NOT NULL,
        expiry_date TIMESTAMP,
        auto_expire BOOLEAN DEFAULT TRUE,
        minimum_order_amount DECIMAL(15, 2),
        applicable_categories TEXT,
        usage_limit_per_order DECIMAL(15, 2),
        description TEXT,
        internal_notes TEXT,
        customer_notes TEXT,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (account_id, id),
        CONSTRAINT fk_credit_customer FOREIGN KEY (account_id, customer_id) 
            REFERENCES customers(account_id, id) ON DELETE CASCADE,
        CONSTRAINT fk_credit_invoice FOREIGN KEY (account_id, invoice_id) 
            REFERENCES invoices(account_id, id) ON DELETE SET NULL,
        CONSTRAINT fk_credit_return FOREIGN KEY (account_id, sales_return_id) 
            REFERENCES sales_returns(account_id, id) ON DELETE SET NULL
    );

    -- Create indexes for customer_credits
    CREATE INDEX IF NOT EXISTS idx_customer_credits_account_id ON customer_credits(account_id);
    CREATE INDEX IF NOT EXISTS idx_customer_credits_customer_id ON customer_credits(account_id, customer_id);
    CREATE INDEX IF NOT EXISTS idx_customer_credits_credit_number ON customer_credits(account_id, credit_number);
    CREATE INDEX IF NOT EXISTS idx_customer_credits_status ON customer_credits(account_id, status);
    CREATE INDEX IF NOT EXISTS idx_customer_credits_date ON customer_credits(account_id, credit_date DESC);
    CREATE INDEX IF NOT EXISTS idx_customer_credits_expiry ON customer_credits(account_id, expiry_date);

    -- =====================================================
    -- CREDIT TRANSACTIONS TABLE
    -- =====================================================
    CREATE TABLE IF NOT EXISTS credit_transactions (
        account_id VARCHAR(50) NOT NULL,
        id SERIAL NOT NULL,
        credit_id INTEGER NOT NULL,
        transaction_type VARCHAR(50) NOT NULL,
        transaction_date TIMESTAMP NOT NULL,
        invoice_id INTEGER,
        amount DECIMAL(15, 2) NOT NULL,
        running_balance DECIMAL(15, 2) NOT NULL,
        description TEXT,
        reference_number VARCHAR(100),
        performed_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (account_id, id),
        CONSTRAINT fk_transaction_credit FOREIGN KEY (account_id, credit_id) 
            REFERENCES customer_credits(account_id, id) ON DELETE CASCADE,
        CONSTRAINT fk_transaction_invoice FOREIGN KEY (account_id, invoice_id) 
            REFERENCES invoices(account_id, id) ON DELETE SET NULL
    );

    -- Create indexes for credit_transactions
    CREATE INDEX IF NOT EXISTS idx_credit_transactions_account_id ON credit_transactions(account_id);
    CREATE INDEX IF NOT EXISTS idx_credit_transactions_credit_id ON credit_transactions(account_id, credit_id);
    CREATE INDEX IF NOT EXISTS idx_credit_transactions_date ON credit_transactions(account_id, transaction_date DESC);
    CREATE INDEX IF NOT EXISTS idx_credit_transactions_invoice_id ON credit_transactions(account_id, invoice_id);

    -- =====================================================
    -- CREDIT NOTES TABLE
    -- =====================================================
    CREATE TABLE IF NOT EXISTS credit_notes (
        account_id VARCHAR(50) NOT NULL,
        id SERIAL NOT NULL,
        credit_note_number VARCHAR(100) NOT NULL,
        credit_note_date TIMESTAMP NOT NULL,
        customer_id INTEGER NOT NULL,
        invoice_id INTEGER,
        sales_return_id INTEGER,
        credit_id INTEGER,
        total_amount DECIMAL(15, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'issued',
        notes TEXT,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (account_id, id),
        CONSTRAINT fk_note_customer FOREIGN KEY (account_id, customer_id) 
            REFERENCES customers(account_id, id) ON DELETE CASCADE,
        CONSTRAINT fk_note_invoice FOREIGN KEY (account_id, invoice_id) 
            REFERENCES invoices(account_id, id) ON DELETE SET NULL,
        CONSTRAINT fk_note_return FOREIGN KEY (account_id, sales_return_id) 
            REFERENCES sales_returns(account_id, id) ON DELETE SET NULL,
        CONSTRAINT fk_note_credit FOREIGN KEY (account_id, credit_id) 
            REFERENCES customer_credits(account_id, id) ON DELETE SET NULL
    );

    -- Create indexes for credit_notes
    CREATE INDEX IF NOT EXISTS idx_credit_notes_account_id ON credit_notes(account_id);
    CREATE INDEX IF NOT EXISTS idx_credit_notes_customer_id ON credit_notes(account_id, customer_id);
    CREATE INDEX IF NOT EXISTS idx_credit_notes_number ON credit_notes(account_id, credit_note_number);
    CREATE INDEX IF NOT EXISTS idx_credit_notes_date ON credit_notes(account_id, credit_note_date DESC);

    COMMENT ON TABLE customer_credits IS 'Stores customer credit balances and details';
    COMMENT ON TABLE credit_transactions IS 'Stores transactions for credit usage and adjustments';
    COMMENT ON TABLE credit_notes IS 'Stores formal credit note documents';
    """
    
    try:
        print("Connecting to PostgreSQL database...")
        with postgres_db.get_connection() as conn:
            print("Creating credits tables...")
            with conn.cursor() as cur:
                cur.execute(create_tables_sql)
                conn.commit()
            
            print("✅ Credits tables created successfully!")
            
            # Verify tables exist
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name IN ('customer_credits', 'credit_transactions', 'credit_notes')
                    ORDER BY table_name
                """)
                tables = cur.fetchall()
                
                print("\n📋 Created tables:")
                for table in tables:
                    print(f"  ✓ {table[0]}")
                    
                    # Show column count for each table
                    cur.execute(f"""
                        SELECT COUNT(*) 
                        FROM information_schema.columns 
                        WHERE table_name = '{table[0]}'
                    """)
                    col_count = cur.fetchone()[0]
                    print(f"    ({col_count} columns)")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = setup_credits_tables()
    sys.exit(0 if success else 1)
