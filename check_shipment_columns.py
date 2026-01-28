"""Check shipments table columns."""
import sys
sys.path.insert(0, 'backend')

from database.postgres_db import postgres_db

with postgres_db.get_connection() as conn:
    cur = conn.cursor()
    
    cur.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name='shipments'
        ORDER BY ordinal_position
    """)
    
    print("📋 Shipments table columns:")
    for col, dtype, nullable in cur.fetchall():
        print(f"  - {col}: {dtype} (nullable: {nullable})")
    
    cur.close()
