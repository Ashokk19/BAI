#!/usr/bin/env python3
"""
Test item deletion to verify the inventory log fix.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy.orm import sessionmaker
from backend.database.database import engine
from backend.models.item import Item
from backend.models.user import User
from backend.services.inventory_service import InventoryService
from decimal import Decimal

def test_item_deletion():
    """Test item deletion with inventory logging."""
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Get a user
        user = db.query(User).first()
        if not user:
            print("❌ No users found!")
            return
        
        print(f"Using user: {user.account_id}")
        
        # Create a test item first
        test_item = Item(
            account_id=user.account_id,
            item_code='DELETE-TEST-001',
            name='Test Delete Item',
            selling_price=Decimal('100.00'),
            description='Item to test deletion',
            category='Test',
            unit='pcs',
            purchase_price=Decimal('80.00'),
            current_stock=Decimal('5.000'),
            minimum_stock=Decimal('2.000')
        )
        
        db.add(test_item)
        db.flush()  # Get the ID
        
        print(f"Created test item: ID={test_item.id}, Name='{test_item.name}'")
        
        # Test the deletion logging
        print("\n=== Testing item deletion logging ===")
        
        try:
            log_entry = InventoryService.log_item_deletion(
                db=db,
                item_id=test_item.id,
                item_name=test_item.name,
                item_sku=test_item.item_code,
                final_stock=int(test_item.current_stock),
                user_id=user.id,
                account_id=user.account_id,
                notes="Test deletion"
            )
            
            db.flush()  # This will trigger any constraint violations
            print("✅ Item deletion logged successfully")
            print(f"   Log ID: {log_entry.id}")
            print(f"   Transaction type: {log_entry.transaction_type}")
            print(f"   Notes: {log_entry.notes}")
            
        except Exception as e:
            print(f"❌ Error logging item deletion: {e}")
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
    test_item_deletion()
