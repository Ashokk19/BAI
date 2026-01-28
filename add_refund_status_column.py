"""
Add refund_status column to sales_returns table
"""
import sys
import os

# Add backend directory to path
backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_dir)

from database.postgres_db import postgres_db

def add_refund_status_column():
    """Add refund_status column to sales_returns table"""
    
    try:
        print("Connecting to PostgreSQL database...")
        with postgres_db.get_connection() as conn:
            with conn.cursor() as cur:
                # Add refund_status column if it doesn't exist
                print("Adding refund_status column...")
                cur.execute("""
                    ALTER TABLE sales_returns 
                    ADD COLUMN IF NOT EXISTS refund_status VARCHAR(50) DEFAULT 'pending'
                """)
                
                # Update existing rows to have pending status
                cur.execute("""
                    UPDATE sales_returns 
                    SET refund_status = 'pending' 
                    WHERE refund_status IS NULL
                """)
                
                conn.commit()
                print("✅ refund_status column added successfully!")
                
                # Verify column exists
                cur.execute("""
                    SELECT column_name, data_type, column_default
                    FROM information_schema.columns
                    WHERE table_name = 'sales_returns' AND column_name = 'refund_status'
                """)
                result = cur.fetchone()
                
                if result:
                    print(f"\n✓ Column verified: {result[0]} ({result[1]}) DEFAULT {result[2]}")
                else:
                    print("\n⚠ Column not found after creation")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = add_refund_status_column()
    sys.exit(0 if success else 1)
