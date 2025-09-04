#!/usr/bin/env python3
"""
Test database connection and basic operations.
"""

from database.database import get_db
from models.customer import Customer
from models.item import Item
from models.invoice import Invoice
from sqlalchemy.orm import Session

def test_db_connection():
    """Test basic database operations."""
    try:
        # Get database session
        db = next(get_db())
        print("✅ Database connection successful")
        
        # Test customer query
        customers = db.query(Customer).limit(1).all()
        print(f"✅ Customer query successful: {len(customers)} customers found")
        
        # Test item query
        items = db.query(Item).limit(1).all()
        print(f"✅ Item query successful: {len(items)} items found")
        
        # Test invoice query
        invoices = db.query(Invoice).limit(1).all()
        print(f"✅ Invoice query successful: {len(invoices)} invoices found")
        
        db.close()
        print("✅ All database operations successful")
        
    except Exception as e:
        print(f"❌ Database error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_db_connection()







