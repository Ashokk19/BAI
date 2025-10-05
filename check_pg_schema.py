#!/usr/bin/env python3
"""
Check the actual PostgreSQL schema for items table.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy import text
from backend.database.database import engine

def check_pg_schema():
    """Check the actual PostgreSQL schema."""
    
    with engine.connect() as conn:
        print("=== ITEMS TABLE COLUMNS (PostgreSQL) ===")
        result = conn.execute(text("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'items' 
            ORDER BY ordinal_position
        """))
        
        print("Column Name               | Data Type        | Nullable | Default")
        print("-" * 70)
        for row in result:
            nullable = "YES" if row[2] == "YES" else "NO"
            default = row[3] if row[3] else "None"
            print(f"{row[0]:<25} | {row[1]:<15} | {nullable:<8} | {default}")
        
        print("\n=== CONSTRAINTS ===")
        result = conn.execute(text("""
            SELECT constraint_name, constraint_type
            FROM information_schema.table_constraints 
            WHERE table_name = 'items'
        """))
        
        for row in result:
            print(f"{row[0]:<40} {row[1]}")
        
        print("\n=== SAMPLE ITEMS (if any) ===")
        result = conn.execute(text("SELECT COUNT(*) FROM items"))
        count = result.scalar()
        print(f"Total items in database: {count}")
        
        if count > 0:
            result = conn.execute(text("SELECT * FROM items LIMIT 2"))
            columns = result.keys()
            print("Sample data:")
            for row in result:
                for i, col in enumerate(columns):
                    print(f"  {col}: {row[i]}")
                print("---")

if __name__ == "__main__":
    check_pg_schema()
