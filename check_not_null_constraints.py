#!/usr/bin/env python3
"""
Check for NOT NULL constraints in PostgreSQL items table.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy import text
from backend.database.database import engine

def check_not_null_constraints():
    """Check for NOT NULL constraints."""
    
    with engine.connect() as conn:
        print("=== NOT NULL CONSTRAINTS IN ITEMS TABLE ===")
        result = conn.execute(text("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'items' AND is_nullable = 'NO'
            ORDER BY ordinal_position
        """))
        
        print("Column Name               | Data Type        | Default")
        print("-" * 60)
        not_null_fields = []
        for row in result:
            not_null_fields.append(row[0])
            default = row[3] if row[3] else "None"
            print(f"{row[0]:<25} | {row[1]:<15} | {default}")
        
        print(f"\n=== SUMMARY ===")
        print(f"NOT NULL fields: {not_null_fields}")
        
        print(f"\n=== CHECK IF THESE FIELDS ARE HANDLED IN API ===")
        api_mapped_fields = [
            'account_id', 'item_code', 'name', 'selling_price',  # Required fields we handle
        ]
        
        missing_in_api = set(not_null_fields) - set(api_mapped_fields)
        if missing_in_api:
            print(f"❌ NOT NULL fields missing in API mapping: {missing_in_api}")
        else:
            print(f"✅ All NOT NULL fields are handled in API mapping")

if __name__ == "__main__":
    check_not_null_constraints()
