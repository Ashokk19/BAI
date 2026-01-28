#!/usr/bin/env python3
"""
Test script for invoices endpoint
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from backend.config.settings import settings
from backend.models.invoice import Invoice

def test_invoices_model():
    """Test invoices model functionality"""
    try:
        # Create database connection
        engine = create_engine(settings.database_url)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        print("Testing invoices model...")
        
        # Test querying invoices
        invoices = db.query(Invoice).all()
        print(f"✅ Found {len(invoices)} invoices in database")
        
        # Test that all required fields are accessible by creating a test invoice (but don't commit)
        from datetime import datetime
        test_invoice = Invoice(
            account_id="test_account",
            invoice_number="INV-001",
            invoice_date=datetime.now(),
            customer_account_id="test_account",
            customer_id=1,
            status="draft",
            invoice_type="sale",
            subtotal=100.00,
            tax_amount=18.00,
            total_amount=118.00,
            currency="USD",
            payment_terms="immediate"
        )
        
        # Test that all required fields are accessible
        print(f"✅ Test invoice created with number: {test_invoice.invoice_number}")
        print(f"✅ Invoice type: {test_invoice.invoice_type}")
        print(f"✅ Total amount: {test_invoice.total_amount}")
        print(f"✅ Currency: {test_invoice.currency}")
        print(f"✅ Payment terms: {test_invoice.payment_terms}")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"❌ Invoices model test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_invoices_model()
