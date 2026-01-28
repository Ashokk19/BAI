#!/usr/bin/env python3
"""
Test the item deletion fix.
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

def test_deletion_fix():
    """Test item deletion with existing inventory logs."""
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Get a user
        user = db.query(User).first()
        if not user:
            print("❌ No users found!")
            return
        
        print(f"Using user: {user.account_id}")
        
        # Create a test item
        test_item = Item(
            account_id=user.account_id,
            item_code='DEL-FIX-001',
            name='Test Delete Fix Item',
            selling_price=Decimal('100.00'),
            description='Item to test deletion fix',
            category='Test',
            unit='pcs',
            purchase_price=Decimal('80.00'),
            current_stock=Decimal('5.000'),
            minimum_stock=Decimal('2.000'),
            sku='DEL-FIX-001'
        )
        
        db.add(test_item)
        db.flush()  # Get the ID
        
        print(f"Created test item: ID={test_item.id}, Name='{test_item.name}'")
        
        # Create some inventory logs for this item (simulating the foreign key constraint issue)
        log1 = InventoryLog(
            item_id=test_item.id,
            account_id=user.account_id,
            item_account_id=user.account_id,
            transaction_type="item_created",
            quantity_before=Decimal('0.000'),
            quantity_change=Decimal('5.000'),
            quantity_after=Decimal('5.000'),
            transaction_date=datetime.now(),
            notes="Initial stock",
            recorded_by=user.id,
            recorded_by_account_id=user.account_id
        )
        
        log2 = InventoryLog(
            item_id=test_item.id,
            account_id=user.account_id,
            item_account_id=user.account_id,
            transaction_type="item_updated",
            quantity_before=Decimal('5.000'),
            quantity_change=Decimal('0.000'),
            quantity_after=Decimal('5.000'),
            transaction_date=datetime.now(),
            notes="Item updated",
            recorded_by=user.id,
            recorded_by_account_id=user.account_id
        )
        
        db.add(log1)
        db.add(log2)
        db.flush()
        
        print(f"Created 2 inventory logs for item {test_item.id}")
        
        # Now test the deletion logic
        print("\n=== Testing deletion with existing logs ===")
        
        # Check existing logs
        existing_logs = db.query(InventoryLog).filter(
            InventoryLog.item_id == test_item.id,
            InventoryLog.item_account_id == user.account_id
        ).all()
        
        print(f"Found {len(existing_logs)} existing logs")
        
        # Delete logs first (simulating the fix)
        for log in existing_logs:
            db.delete(log)
        
        print(f"Deleted {len(existing_logs)} inventory logs")
        
        # Then delete the item
        db.delete(test_item)
        print(f"Deleted item {test_item.id}")
        
        db.flush()  # This should not cause foreign key constraint violation
        print("✅ Item deletion successful - no foreign key constraint violation")
        
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
    test_deletion_fix()
