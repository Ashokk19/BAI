#!/usr/bin/env python3
"""
Script to check what invoice and shipment data exists in the database.
"""

import sqlite3
from pathlib import Path

def check_invoice_data():
    """Check what invoice and shipment data exists in the database."""
    
    db_path = Path("bai_db.db")
    
    if not db_path.exists():
        print(f"❌ Database not found at {db_path}")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("🔍 Checking database for invoice and shipment data...")
        
        # Check invoices
        cursor.execute("SELECT COUNT(*) FROM invoices")
        invoice_count = cursor.fetchone()[0]
        print(f"📄 Invoices: {invoice_count}")
        
        if invoice_count > 0:
            cursor.execute("SELECT id, invoice_number, customer_id, status FROM invoices LIMIT 5")
            invoices = cursor.fetchall()
            print("   Sample invoices:")
            for invoice in invoices:
                print(f"     - ID: {invoice[0]}, Number: {invoice[1]}, Customer: {invoice[2]}, Status: {invoice[3]}")
        
        # Check shipments
        cursor.execute("SELECT COUNT(*) FROM shipments")
        shipment_count = cursor.fetchone()[0]
        print(f"🚚 Shipments: {shipment_count}")
        
        if shipment_count > 0:
            cursor.execute("SELECT id, invoice_id, status, created_at FROM shipments LIMIT 5")
            shipments = cursor.fetchall()
            print("   Sample shipments:")
            for shipment in shipments:
                print(f"     - ID: {shipment[0]}, Invoice: {shipment[1]}, Status: {shipment[2]}, Created: {shipment[3]}")
        
        # Check delivery notes
        cursor.execute("SELECT COUNT(*) FROM delivery_notes")
        delivery_notes_count = cursor.fetchone()[0]
        print(f"📝 Delivery Notes: {delivery_notes_count}")
        
        if delivery_notes_count > 0:
            cursor.execute("SELECT id, invoice_id, delivery_status, created_at FROM delivery_notes LIMIT 5")
            delivery_notes = cursor.fetchall()
            print("   Sample delivery notes:")
            for note in delivery_notes:
                print(f"     - ID: {note[0]}, Invoice: {note[1]}, Status: {note[2]}, Created: {note[3]}")
        
        # Check payments
        cursor.execute("SELECT COUNT(*) FROM payments")
        payment_count = cursor.fetchone()[0]
        print(f"💰 Payments: {payment_count}")
        
        return True
        
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    print("🔍 Invoice Data Checker")
    print("=" * 40)
    
    check_invoice_data()



