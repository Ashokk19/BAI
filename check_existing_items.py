#!/usr/bin/env python3
"""
Check existing items to understand the structure.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy import text
from backend.database.database import engine

def check_existing_items():
    """Check existing items structure."""
    
    with engine.connect() as conn:
        # Get sample items to see actual structure
        print("=== SAMPLE ITEMS FROM DATABASE ===")
        result = conn.execute(text("""
            SELECT * FROM items LIMIT 3
        """))
        
        # Get column names
        columns = result.keys()
        print("Columns:", list(columns))
        
        # Show sample data
        rows = result.fetchall()
        print(f"\nFound {len(rows)} items:")
        for i, row in enumerate(rows):
            print(f"\nItem {i+1}:")
            for j, col in enumerate(columns):
                print(f"  {col}: {row[j]}")

if __name__ == "__main__":
    check_existing_items()
