#!/usr/bin/env python3
"""
Test script for sales returns query
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from backend.config.settings import settings
from backend.models.sales_return import SalesReturn
from backend.models.customer import Customer
from backend.models.invoice import Invoice

def test_sales_returns_query():
    """Test sales returns query that mimics the API endpoint"""
    try:
        # Create database connection
        engine = create_engine(settings.database_url)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        print("Testing sales returns query...")
        
        # Test simple query first
        print("1. Testing simple SalesReturn query...")
        sales_returns = db.query(SalesReturn).all()
        print(f"✅ Found {len(sales_returns)} sales returns")
        
        # Test the problematic join query from the API
        print("2. Testing join query with Customer and Invoice...")
        try:
            query = db.query(SalesReturn).join(Customer).join(Invoice)
            results = query.all()
            print(f"✅ Join query successful, found {len(results)} results")
        except Exception as e:
            print(f"❌ Join query failed: {e}")
            
            # Try individual joins to identify the problem
            print("3. Testing individual joins...")
            
            try:
                # Test join with Customer
                customer_join = db.query(SalesReturn).join(Customer, 
                    (SalesReturn.customer_account_id == Customer.account_id) & 
                    (SalesReturn.customer_id == Customer.id)).all()
                print(f"✅ Customer join successful, found {len(customer_join)} results")
            except Exception as e2:
                print(f"❌ Customer join failed: {e2}")
            
            try:
                # Test join with Invoice
                invoice_join = db.query(SalesReturn).join(Invoice,
                    (SalesReturn.invoice_account_id == Invoice.account_id) & 
                    (SalesReturn.invoice_id == Invoice.id)).all()
                print(f"✅ Invoice join successful, found {len(invoice_join)} results")
            except Exception as e3:
                print(f"❌ Invoice join failed: {e3}")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"❌ Sales returns query test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_sales_returns_query()
