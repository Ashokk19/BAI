#!/usr/bin/env python3
"""
Test script for payments endpoint
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from backend.config.settings import settings
from backend.models.payment import Payment

def test_payments_model():
    """Test payments model functionality"""
    try:
        # Create database connection
        engine = create_engine(settings.database_url)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        print("Testing payments model...")
        
        # Test querying payments
        payments = db.query(Payment).all()
        print(f"✅ Found {len(payments)} payments in database")
        
        # Test that all required fields are accessible by creating a test payment (but don't commit)
        from datetime import datetime
        test_payment = Payment(
            account_id="test_account",
            payment_number="PAY-001",
            payment_date=datetime.now(),
            payment_type="invoice_payment",
            payment_direction="incoming",
            amount=100.00,
            currency="USD",
            payment_method="credit_card",
            payment_status="completed",
            recorded_by_account_id="test_account",
            recorded_by=1
        )
        
        # Test that all required fields are accessible
        print(f"✅ Test payment created with number: {test_payment.payment_number}")
        print(f"✅ Payment type: {test_payment.payment_type}")
        print(f"✅ Payment direction: {test_payment.payment_direction}")
        print(f"✅ Amount: {test_payment.amount}")
        print(f"✅ Currency: {test_payment.currency}")
        print(f"✅ Payment method: {test_payment.payment_method}")
        print(f"✅ Payment status: {test_payment.payment_status}")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"❌ Payments model test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_payments_model()
