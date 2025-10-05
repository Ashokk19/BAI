#!/usr/bin/env python3
"""
Test the updated item model with actual database schema.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy.orm import sessionmaker
from backend.database.database import engine
from backend.models.item import Item
from backend.models.user import User
from decimal import Decimal

def test_new_model():
    """Test the updated item model."""
    
    # Create session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Get a user
        user = db.query(User).first()
        if not user:
            print("❌ No users found!")
            return
        
        print(f"Using user: {user.account_id}")
        
        # Create test item with actual database schema
        test_item = Item(
            account_id=user.account_id,
            item_code='TEST-NEW-001',
            name='Test New Item',
            selling_price=Decimal('120.00'),
            description='Test item with new model',
            category='Electronics',
            unit='pcs',
            purchase_price=Decimal('100.00'),
            tax_rate=Decimal('18.00'),
            is_active=True
        )
        
        print("Creating item with data:")
        print(f"  account_id: {test_item.account_id}")
        print(f"  item_code: {test_item.item_code}")
        print(f"  name: {test_item.name}")
        print(f"  selling_price: {test_item.selling_price}")
        print(f"  category: {test_item.category}")
        
        db.add(test_item)
        db.commit()
        db.refresh(test_item)
        
        print(f"✅ Successfully created item: ID={test_item.id}")
        print(f"   SKU (computed): {test_item.sku}")
        print(f"   Cost price (computed): {test_item.cost_price}")
        
        # Clean up
        db.delete(test_item)
        db.commit()
        print("🧹 Cleaned up test item")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    test_new_model()
