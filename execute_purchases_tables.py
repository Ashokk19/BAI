"""Execute the purchases tables SQL script"""
import sys
sys.path.insert(0, 'backend')

from database.postgres_db import postgres_db

def create_purchases_tables():
    """Create all purchases module tables"""
    
    # Read the SQL file
    import os
    sql_file_path = os.path.join(os.path.dirname(__file__), 'create_purchases_tables.sql')
    with open(sql_file_path, 'r') as f:
        sql_script = f.read()
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor()
        
        try:
            print("Creating purchases module tables...")
            cursor.execute(sql_script)
            conn.commit()
            print("✅ All purchases tables created successfully!")
            
            # Verify tables were created
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN (
                    'vendors', 'purchase_orders', 'purchase_order_items',
                    'purchase_receipts', 'purchase_receipt_items', 'bills',
                    'bill_items', 'vendor_payments', 'vendor_payment_allocations',
                    'vendor_credits', 'vendor_credit_allocations'
                )
                ORDER BY table_name
            """)
            tables = cursor.fetchall()
            print(f"\nCreated {len(tables)} tables:")
            for table in tables:
                print(f"  ✓ {table[0]}")
                
        except Exception as e:
            conn.rollback()
            print(f"❌ Error creating tables: {e}")
            raise
        finally:
            cursor.close()

if __name__ == "__main__":
    create_purchases_tables()
