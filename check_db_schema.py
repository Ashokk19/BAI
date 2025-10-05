#!/usr/bin/env python3
"""
Check the actual database schema for items table.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy import text
from backend.database.database import engine

def check_schema():
    """Check the actual database schema."""
    
    with engine.connect() as conn:
        # Check items table structure
        print("=== ITEMS TABLE STRUCTURE ===")
        result = conn.execute(text("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'items' 
            ORDER BY ordinal_position
        """))
        
        for row in result:
            nullable = "NULL" if row[2] == "YES" else "NOT NULL"
            default = f" DEFAULT {row[3]}" if row[3] else ""
            print(f"{row[0]:<25} {row[1]:<15} {nullable:<10} {default}")
        
        print("\n=== ITEMS TABLE CONSTRAINTS ===")
        result = conn.execute(text("""
            SELECT constraint_name, constraint_type
            FROM information_schema.table_constraints 
            WHERE table_name = 'items'
        """))
        
        for row in result:
            print(f"{row[0]:<40} {row[1]}")
        
        print("\n=== FOREIGN KEY CONSTRAINTS ===")
        result = conn.execute(text("""
            SELECT 
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name 
            FROM information_schema.key_column_usage kcu
            JOIN information_schema.constraint_column_usage ccu 
                ON kcu.constraint_name = ccu.constraint_name
            WHERE kcu.table_name = 'items' 
                AND EXISTS (
                    SELECT 1 FROM information_schema.table_constraints tc 
                    WHERE tc.constraint_name = kcu.constraint_name 
                        AND tc.constraint_type = 'FOREIGN KEY'
                )
        """))
        
        for row in result:
            print(f"{row[0]} -> {row[1]}.{row[2]}")

if __name__ == "__main__":
    check_schema()
