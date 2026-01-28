"""
Check invoice count in database
"""
import sys
import os

backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_dir)

from database.postgres_db import postgres_db

def check_invoice_count():
    try:
        print("Connecting to PostgreSQL database...")
        with postgres_db.get_connection() as conn:
            with conn.cursor() as cur:
                # Count invoices by account
                cur.execute("""
                    SELECT account_id, COUNT(*) as count
                    FROM invoices
                    GROUP BY account_id
                    ORDER BY count DESC
                """)
                
                results = cur.fetchall()
                print("\n📊 Invoice counts by account:")
                total = 0
                for row in results:
                    print(f"  Account '{row[0]}': {row[1]} invoices")
                    total += row[1]
                
                print(f"\n  Total invoices in database: {total}")
                
                # Check for test data
                cur.execute("""
                    SELECT COUNT(*) 
                    FROM invoices 
                    WHERE invoice_number LIKE 'INV-%' OR invoice_number LIKE 'TEST%'
                """)
                test_count = cur.fetchone()[0]
                print(f"  Potential test invoices: {test_count}")
                
                # Show sample invoice numbers
                cur.execute("""
                    SELECT invoice_number, account_id, created_at
                    FROM invoices
                    ORDER BY created_at DESC
                    LIMIT 10
                """)
                
                print("\n📋 Most recent invoices:")
                for row in cur.fetchall():
                    print(f"  {row[0]} (Account: {row[1]}, Created: {row[2]})")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = check_invoice_count()
    sys.exit(0 if success else 1)
