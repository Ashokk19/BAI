"""Check what data is actually in the shipments table."""
import sys
sys.path.insert(0, 'backend')

from database.postgres_db import postgres_db
import psycopg2.extras

with postgres_db.get_connection() as conn:
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    cursor.execute("""
        SELECT id, shipment_number, tracking_number, shipment_date, 
               expected_delivery, carrier, shipping_method, customer_id
        FROM shipments 
        ORDER BY id DESC 
        LIMIT 5
    """)
    
    print("\nRecent Shipments Data:")
    print("-" * 100)
    for row in cursor.fetchall():
        print(f"ID: {row['id']}")
        print(f"  Shipment Number: {row['shipment_number']}")
        print(f"  Tracking Number: {row['tracking_number']}")
        print(f"  Shipment Date: {row['shipment_date']}")
        print(f"  Expected Delivery: {row['expected_delivery']}")
        print(f"  Carrier: {row['carrier']}")
        print(f"  Shipping Method: {row['shipping_method']}")
        print(f"  Customer ID: {row['customer_id']}")
        print("-" * 100)
    
    cursor.close()
