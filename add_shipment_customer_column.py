"""Add missing columns to shipments table - customer_id and special_instructions."""
import sys
sys.path.insert(0, 'backend')

from database.postgres_db import postgres_db
import psycopg2.extras

# Additional columns needed
columns_to_add = [
    ("customer_id", "INTEGER", "NULL"),
    ("special_instructions", "TEXT", "NULL"),
]

with postgres_db.get_connection() as conn:
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    print("Adding additional columns to shipments table...")
    print("-" * 60)
    
    for column_name, data_type, constraint in columns_to_add:
        try:
            # Check if column exists
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'shipments' AND column_name = %s
            """, (column_name,))
            
            if cursor.fetchone():
                print(f"✓ Column {column_name} already exists")
            else:
                # Add the column
                sql = f"ALTER TABLE shipments ADD COLUMN {column_name} {data_type} {constraint}"
                cursor.execute(sql)
                conn.commit()
                print(f"✓ Added column {column_name} ({data_type})")
        except Exception as e:
            print(f"✗ Error adding column {column_name}: {e}")
            conn.rollback()
    
    cursor.close()
    print("\nMigration complete!")
