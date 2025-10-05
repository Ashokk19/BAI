#!/usr/bin/env python3
"""
Test script for sales returns endpoint
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from backend.config.settings import settings
from backend.models.sales_return import SalesReturn

def test_sales_returns_model():
    """Test sales returns model functionality"""
    try:
        # Create database connection
        engine = create_engine(settings.database_url)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        print("Testing sales returns model...")
        
        # Test querying sales returns
        sales_returns = db.query(SalesReturn).all()
        print(f"✅ Found {len(sales_returns)} sales returns in database")
        
        # Test that all required fields are accessible by creating a test sales return (but don't commit)
        from datetime import datetime
        test_return = SalesReturn(
            account_id="test_account",
            return_number="RET-001",
            return_date=datetime.now(),
            invoice_account_id="test_account",
            invoice_id=1,
            customer_account_id="test_account",
            customer_id=1,
            return_type="partial_return",
            return_reason="defective_product",
            status="pending",
            subtotal=100.00,
            tax_amount=18.00,
            total_amount=118.00,
            refund_amount=118.00,
            refund_method="credit_card",
            refund_status="pending"
        )
        
        # Test that all required fields are accessible
        print(f"✅ Test sales return created with number: {test_return.return_number}")
        print(f"✅ Return type: {test_return.return_type}")
        print(f"✅ Return reason: {test_return.return_reason}")
        print(f"✅ Total amount: {test_return.total_amount}")
        print(f"✅ Refund amount: {test_return.refund_amount}")
        print(f"✅ Refund method: {test_return.refund_method}")
        print(f"✅ Refund status: {test_return.refund_status}")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"❌ Sales returns model test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_sales_returns_model()
