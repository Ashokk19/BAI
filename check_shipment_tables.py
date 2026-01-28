"""Check if shipments and delivery_notes tables exist."""
import sys
sys.path.insert(0, 'backend')

from database.postgres_db import postgres_db

with postgres_db.get_connection() as conn:
    cur = conn.cursor()
    
    # Check for shipments table
    cur.execute("""
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns
        WHERE table_schema='public' AND table_name IN ('shipments', 'delivery_notes')
        ORDER BY table_name, ordinal_position
    """)
    
    results = cur.fetchall()
    
    if not results:
        print("❌ No shipments or delivery_notes tables found!")
    else:
        print("✅ Found tables:")
        current_table = None
        for table, column, dtype in results:
            if table != current_table:
                print(f"\n📋 Table: {table}")
                current_table = table
            print(f"  - {column}: {dtype}")
    
    cur.close()
