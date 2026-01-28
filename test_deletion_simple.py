#!/usr/bin/env python3
"""
Simple test for item deletion logging fix.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy.orm import sessionmaker
from backend.database.database import engine
from backend.models.item import Item
from backend.models.user import User
from backend.models.inventory import InventoryLog
from decimal import Decimal
from datetime import datetime

def test_deletion_logging():
    """Test inventory log creation with required fields."""
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Get a user
        user = db.query(User).first()
        if not user:
            print("❌ No users found!")
            return
        
        print(f"Using user: {user.account_id}")
        
        # Test creating an inventory log entry directly
        print("\n=== Testing inventory log creation ===")
        
        try:
            log_entry = InventoryLog(
                item_id=6,  # Using existing item ID from error
                account_id=user.account_id,
                item_account_id=user.account_id,  # This was missing before!
                transaction_type="item_deleted",
                transaction_reference=None,
                quantity_before=Decimal('0.000'),
                quantity_change=Decimal('0.000'),
                quantity_after=Decimal('0.000'),
                unit_cost=None,
                transaction_date=datetime.now(),
                notes="Test deletion log entry",
                recorded_by=user.id,
                recorded_by_account_id=user.account_id  # This was missing before!
            )
            
            db.add(log_entry)
            db.flush()  # This will trigger any constraint violations
            print("✅ Inventory log created successfully")
            print(f"   Log entry: {log_entry}")
            
        except Exception as e:
            print(f"❌ Error creating inventory log: {e}")
            import traceback
            traceback.print_exc()
        
        # Clean up
        db.rollback()
        print("🧹 Rolled back transaction")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    test_deletion_logging()
