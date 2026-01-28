"""
Debug invoice count issue
"""
import sys
import os

backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_dir)

from database.postgres_db import postgres_db

def debug_invoice_count():
    try:
        print("Connecting to PostgreSQL database...")
        with postgres_db.get_connection() as conn:
            with conn.cursor() as cur:
                # Check basic count
                cur.execute("SELECT COUNT(*) FROM invoices WHERE account_id = 'TestAccount'")
                basic_count = cur.fetchone()[0]
                print(f"\n📊 Basic COUNT: {basic_count}")
                
                # Check distinct count
                cur.execute("SELECT COUNT(DISTINCT id) FROM invoices WHERE account_id = 'TestAccount'")
                distinct_count = cur.fetchone()[0]
                print(f"📊 DISTINCT COUNT: {distinct_count}")
                
                # Check with JOIN (old query)
                cur.execute("""
                    SELECT COUNT(*) as total
                    FROM invoices i
                    LEFT JOIN customers c ON i.customer_id = c.id AND i.account_id = c.account_id
                    WHERE i.account_id = 'TestAccount'
                """)
                join_count = cur.fetchone()[0]
                print(f"📊 JOIN COUNT (old): {join_count}")
                
                # Check with DISTINCT JOIN (new query)
                cur.execute("""
                    SELECT COUNT(DISTINCT i.id) as total
                    FROM invoices i
                    LEFT JOIN customers c ON i.customer_id = c.id AND i.account_id = c.account_id
                    WHERE i.account_id = 'TestAccount'
                """)
                distinct_join_count = cur.fetchone()[0]
                print(f"📊 DISTINCT JOIN COUNT (new): {distinct_join_count}")
                
                # Check customer duplicates
                cur.execute("""
                    SELECT customer_id, COUNT(*) as count
                    FROM customers
                    WHERE account_id = 'TestAccount'
                    GROUP BY customer_id
                    HAVING COUNT(*) > 1
                """)
                dup_customers = cur.fetchall()
                if dup_customers:
                    print(f"\n⚠️  Found duplicate customer IDs:")
                    for row in dup_customers:
                        print(f"  Customer ID {row[0]}: {row[1]} records")
                else:
                    print(f"\n✓ No duplicate customer IDs")
                
                # Check invoice-customer relationship
                cur.execute("""
                    SELECT i.id as invoice_id, i.customer_id, COUNT(c.id) as customer_matches
                    FROM invoices i
                    LEFT JOIN customers c ON i.customer_id = c.id AND i.account_id = c.account_id
                    WHERE i.account_id = 'TestAccount'
                    GROUP BY i.id, i.customer_id
                    HAVING COUNT(c.id) > 1
                """)
                multi_match = cur.fetchall()
                if multi_match:
                    print(f"\n⚠️  Invoices matching multiple customers:")
                    for row in multi_match:
                        print(f"  Invoice {row[0]} (customer_id={row[1]}): {row[2]} customer matches")
                else:
                    print(f"\n✓ Each invoice matches at most 1 customer")
                
                # Show actual invoice IDs
                cur.execute("""
                    SELECT id, invoice_number, customer_id
                    FROM invoices
                    WHERE account_id = 'TestAccount'
                    ORDER BY id
                """)
                print(f"\n📋 Actual invoices:")
                for row in cur.fetchall():
                    print(f"  ID={row[0]}, Number={row[1]}, Customer={row[2]}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = debug_invoice_count()
    sys.exit(0 if success else 1)
