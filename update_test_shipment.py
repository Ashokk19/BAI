"""Update existing shipment with tracking number for testing."""
import sys
sys.path.insert(0, 'backend')

from database.postgres_db import postgres_db
import psycopg2.extras

with postgres_db.get_connection() as conn:
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    # Update shipment 1 with tracking number
    cursor.execute("""
        UPDATE shipments 
        SET tracking_number = 'DTDC123456789',
            shipment_date = '2025-11-29',
            expected_delivery = '2025-12-05'
        WHERE id = 1
        RETURNING id, shipment_number, tracking_number
    """)
    
    result = cursor.fetchone()
    conn.commit()
    
    print(f"\nUpdated Shipment:")
    print(f"  ID: {result['id']}")
    print(f"  Shipment Number: {result['shipment_number']}")
    print(f"  Tracking Number: {result['tracking_number']}")
    
    cursor.close()
    print("\n✓ Shipment updated successfully!")
