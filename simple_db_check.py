#!/usr/bin/env python3
"""
Simple database check to see the exact error.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy import text
from backend.database.database import engine

def simple_check():
    """Simple check of database structure."""
    
    with engine.connect() as conn:
        # Get all NOT NULL columns in items table
        print("=== NOT NULL COLUMNS IN ITEMS TABLE ===")
        result = conn.execute(text("""
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'items' 
                AND is_nullable = 'NO'
            ORDER BY ordinal_position
        """))
        
        columns = []
        for row in result:
            columns.append(row[0])
            print(f"{row[0]:<25} {row[1]}")
        
        print(f"\nTotal NOT NULL columns: {len(columns)}")
        print("Columns:", columns)
        
        # Check if there are any unique constraints
        print("\n=== UNIQUE CONSTRAINTS ===")
        result = conn.execute(text("""
            SELECT constraint_name
            FROM information_schema.table_constraints 
            WHERE table_name = 'items' 
                AND constraint_type = 'UNIQUE'
        """))
        
        for row in result:
            print(f"Constraint: {row[0]}")

if __name__ == "__main__":
    simple_check()
