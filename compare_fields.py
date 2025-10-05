#!/usr/bin/env python3
"""
Compare frontend fields with PostgreSQL schema fields.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy import text
from backend.database.database import engine

def compare_fields():
    """Compare frontend fields with PostgreSQL schema."""
    
    # Frontend fields from ItemUpdate schema
    frontend_fields = {
        'name', 'description', 'sku', 'barcode', 'category_id', 'unit_price', 
        'cost_price', 'selling_price', 'current_stock', 'minimum_stock', 
        'maximum_stock', 'stock_quantity', 'reorder_level', 'unit_of_measure', 
        'weight', 'dimensions', 'has_expiry', 'shelf_life_days', 'expiry_date', 
        'is_active', 'is_serialized', 'tax_rate', 'tax_type', 'unit', 
        'purchase_price', 'category', 'mrp', 'is_service', 'track_inventory'
    }
    
    with engine.connect() as conn:
        print("=== POSTGRESQL COLUMNS ===")
        result = conn.execute(text("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'items' 
            ORDER BY ordinal_position
        """))
        
        db_fields = set()
        print("Column Name               | Data Type        | Nullable")
        print("-" * 60)
        for row in result:
            db_fields.add(row[0])
            nullable = "YES" if row[2] == "YES" else "NO"
            print(f"{row[0]:<25} | {row[1]:<15} | {nullable}")
        
        print(f"\n=== COMPARISON ===")
        print(f"Frontend fields count: {len(frontend_fields)}")
        print(f"Database fields count: {len(db_fields)}")
        
        print(f"\n=== FIELDS ONLY IN FRONTEND (not in DB) ===")
        frontend_only = frontend_fields - db_fields
        for field in sorted(frontend_only):
            print(f"  - {field}")
        
        print(f"\n=== FIELDS ONLY IN DATABASE (not in frontend) ===")
        db_only = db_fields - frontend_fields
        for field in sorted(db_only):
            print(f"  - {field}")
        
        print(f"\n=== COMMON FIELDS ===")
        common = frontend_fields & db_fields
        for field in sorted(common):
            print(f"  ✅ {field}")

if __name__ == "__main__":
    compare_fields()
