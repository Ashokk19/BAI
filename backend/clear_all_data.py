#!/usr/bin/env python3
"""
Script to clear all data from invoices, delivery notes, shipments, and payments tables.
This will reset the system to a clean state.
"""

import sqlite3
import os
from pathlib import Path

def clear_all_data():
    """Clear all data from the specified tables."""
    
    # Get the database path
    db_path = Path(__file__).parent / "bai_db.db"
    
    if not db_path.exists():
        print(f"❌ Database file not found at: {db_path}")
        return
    
    print(f"🗄️  Database found at: {db_path}")
    
    try:
        # Connect to the database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("\n🧹 Starting data cleanup...")
        print("=" * 50)
        
        # Get current record counts
        print("\n📊 Current record counts:")
        tables = ['invoices', 'invoice_items', 'delivery_notes', 'shipments', 'payments']
        
        for table in tables:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                print(f"   {table}: {count} records")
            except sqlite3.OperationalError:
                print(f"   {table}: Table does not exist")
        
        # Confirm deletion
        print("\n⚠️  WARNING: This will delete ALL data from the following tables:")
        print("   - invoices")
        print("   - invoice_items") 
        print("   - delivery_notes")
        print("   - shipments")
        print("   - payments")
        
        confirm = input("\n❓ Are you sure you want to continue? Type 'YES' to confirm: ")
        
        if confirm != "YES":
            print("❌ Operation cancelled by user")
            return
        
        print("\n🗑️  Deleting data...")
        
        # Delete data in the correct order (respecting foreign key constraints)
        delete_queries = [
            "DELETE FROM payments",
            "DELETE FROM invoice_items", 
            "DELETE FROM delivery_notes",
            "DELETE FROM shipments",
            "DELETE FROM invoices"
        ]
        
        for query in delete_queries:
            try:
                cursor.execute(query)
                affected_rows = cursor.rowcount
                table_name = query.split()[-1]
                print(f"   ✅ Deleted {affected_rows} records from {table_name}")
            except sqlite3.OperationalError as e:
                print(f"   ❌ Error deleting from {query.split()[-1]}: {e}")
        
        # Reset auto-increment counters
        print("\n🔄 Resetting auto-increment counters...")
        reset_queries = [
            "DELETE FROM sqlite_sequence WHERE name='invoices'",
            "DELETE FROM sqlite_sequence WHERE name='invoice_items'",
            "DELETE FROM sqlite_sequence WHERE name='delivery_notes'", 
            "DELETE FROM sqlite_sequence WHERE name='shipments'",
            "DELETE FROM sqlite_sequence WHERE name='payments'"
        ]
        
        for query in reset_queries:
            try:
                cursor.execute(query)
                table_name = query.split()[-1].strip("'")
                print(f"   ✅ Reset counter for {table_name}")
            except sqlite3.OperationalError as e:
                print(f"   ❌ Error resetting counter: {e}")
        
        # Commit the changes
        conn.commit()
        
        # Verify deletion
        print("\n📊 Verification - New record counts:")
        for table in tables:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                print(f"   {table}: {count} records")
            except sqlite3.OperationalError:
                print(f"   {table}: Table does not exist")
        
        print("\n🎉 Data cleanup completed successfully!")
        print("💡 The system is now in a clean state.")
        print("   - You can create new invoices, delivery notes, shipments, and payments")
        print("   - The auto-increment counters have been reset")
        print("   - All foreign key relationships have been properly handled")
        
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
        if conn:
            conn.rollback()
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()
            print("\n🔒 Database connection closed")

if __name__ == "__main__":
    print("🧹 BAI System Data Cleanup Tool")
    print("=" * 40)
    clear_all_data()
