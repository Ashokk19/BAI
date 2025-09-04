#!/usr/bin/env python3
"""
Check what data exists in the database after clearing.
"""

import sqlite3
from pathlib import Path

def check_data():
    """Check what data exists in the database."""
    
    db_path = Path(__file__).parent / "bai_db.db"
    
    if not db_path.exists():
        print(f"❌ Database file not found at: {db_path}")
        return
    
    print(f"🗄️  Database found at: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("\n🔍 Checking Database Data...")
        print("=" * 50)
        
        # Check all tables
        tables = [
            'customers', 'items', 'users', 'organizations',
            'invoices', 'invoice_items', 'delivery_notes', 'shipments', 'payments'
        ]
        
        for table in tables:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                print(f"   {table}: {count} records")
                
                if count > 0 and count <= 5:
                    # Show sample data for small tables
                    cursor.execute(f"SELECT * FROM {table} LIMIT 3")
                    rows = cursor.fetchall()
                    for i, row in enumerate(rows):
                        print(f"     Sample {i+1}: {row[:3]}...")  # Show first 3 columns
                        
            except sqlite3.OperationalError:
                print(f"   {table}: Table does not exist")
        
        # Check table schemas
        print("\n📋 Table Schemas:")
        for table in tables:
            try:
                cursor.execute(f"PRAGMA table_info({table})")
                columns = cursor.fetchall()
                print(f"\n   {table}:")
                for col in columns:
                    print(f"     {col[1]} ({col[2]}) - {'NOT NULL' if col[3] else 'NULL'}")
            except sqlite3.OperationalError:
                print(f"   {table}: Table does not exist")
        
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    check_data()







