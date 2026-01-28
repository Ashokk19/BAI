"""Add missing columns to shipments table."""
import sys
sys.path.insert(0, 'backend')

from database.postgres_db import postgres_db
import psycopg2.extras

# Columns to add based on the API requirements
columns_to_add = [
    ("shipping_method", "VARCHAR(50)", "NULL"),
    ("expected_delivery", "DATE", "NULL"),
    ("actual_delivery", "DATE", "NULL"),
    ("weight_kg", "NUMERIC(10, 3)", "NULL"),
    ("shipping_cost", "NUMERIC(10, 2)", "DEFAULT 0"),
    ("shipping_address", "TEXT", "NULL"),
    ("package_count", "INTEGER", "DEFAULT 1"),
    ("dimensions", "VARCHAR(100)", "NULL"),
    ("insurance_cost", "NUMERIC(10, 2)", "DEFAULT 0"),
]

with postgres_db.get_connection() as conn:
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    print("Adding missing columns to shipments table...")
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
