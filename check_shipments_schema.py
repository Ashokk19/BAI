"""Check shipments table schema."""
import sys
sys.path.insert(0, 'backend')

from database.postgres_db import postgres_db
import psycopg2.extras

with postgres_db.get_connection() as conn:
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    cursor.execute("""
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'shipments' 
        ORDER BY ordinal_position
    """)
    
    print("\nShipments table columns:")
    print("-" * 60)
    for row in cursor.fetchall():
        print(f"{row['column_name']:30} {row['data_type']:20} nullable={row['is_nullable']}")
    
    cursor.close()
