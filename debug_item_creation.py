#!/usr/bin/env python3
"""
Debug script to test item creation and identify the exact issue.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy.orm import sessionmaker
from backend.database.database import engine
from backend.models.item import Item, ItemCategory
from backend.models.user import User
from decimal import Decimal

def debug_item_creation():
    """Debug item creation to identify the exact constraint violation."""
    
    # Create session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Check if we have any users
        users = db.query(User).limit(5).all()
        print(f"Found {len(users)} users:")
        for user in users:
            print(f"  - User ID: {user.id}, Account ID: {user.account_id}, Name: {user.first_name} {user.last_name}")
        
        if not users:
            print("❌ No users found! Cannot test item creation.")
            return
        
        user = users[0]  # Use first user
        
        # Check if we have any categories for this user
        categories = db.query(ItemCategory).filter(
            ItemCategory.account_id == user.account_id
        ).all()
        print(f"\nFound {len(categories)} categories for account {user.account_id}:")
        for cat in categories:
            print(f"  - Category ID: {cat.id}, Name: {cat.name}, Account ID: {cat.account_id}")
        
        if not categories:
            print("❌ No categories found! Creating a test category...")
            # Create a test category
            test_category = ItemCategory(
                account_id=user.account_id,
                name="Test Category",
                description="Test category for debugging",
                is_active=True
            )
            db.add(test_category)
            db.commit()
            db.refresh(test_category)
            print(f"✅ Created test category: ID={test_category.id}, Account ID={test_category.account_id}")
            categories = [test_category]
        
        category = categories[0]  # Use first category
        
        # Now try to create an item with all required fields
        print(f"\n🧪 Testing item creation...")
        print(f"Using User: {user.account_id}, Category: {category.id}")
        
        item_data = {
            'account_id': user.account_id,
            'name': 'Debug Test Item',
            'description': 'Test item for debugging',
            'sku': 'DEBUG-001',
            'barcode': None,
            'category_account_id': user.account_id,  # This is critical!
            'category_id': category.id,
            'current_stock': Decimal('10.000'),
            'minimum_stock': Decimal('5.000'),
            'maximum_stock': None,
            'reorder_level': None,
            'cost_price': Decimal('100.00'),
            'selling_price': Decimal('120.00'),
            'mrp': None,
            'unit': 'pcs',
            'weight': None,
            'dimensions': None,
            'is_active': True,
            'is_service': False,
            'track_inventory': True,
            'has_expiry': False,
            'shelf_life_days': None,
            'expiry_date': None
        }
        
        print("Item data:")
        for key, value in item_data.items():
            print(f"  {key}: {value}")
        
        # Create the item
        item = Item(**item_data)
        db.add(item)
        db.commit()
        db.refresh(item)
        
        print(f"✅ Successfully created item: ID={item.id}, Name={item.name}")
        
        # Clean up - delete the test item
        db.delete(item)
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
    debug_item_creation()
