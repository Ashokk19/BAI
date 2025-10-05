#!/usr/bin/env python3
"""
Test item creation with authentication to reproduce the 500 error.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy.orm import sessionmaker
from backend.database.database import engine
from backend.models.item import Item
from backend.models.user import User
from decimal import Decimal

def test_with_mock_auth():
    """Test item creation with mock authentication."""
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Get a real user
        user = db.query(User).first()
        if not user:
            print("❌ No users found!")
            return
        
        print(f"Using user: {user.account_id}")
        
        # Create item data exactly as frontend would send
        item_dict = {
            "name": "Test Auth Item",
            "sku": "AUTH-TEST-001",
            "category_id": 1,
            "unit_price": 100.0,
            "selling_price": 120.0,
            "current_stock": 10.0,  # Using float as per schema fix
            "minimum_stock": 5.0,   # Using float as per schema fix
            "unit_of_measure": "pcs",
            "is_active": True,
            "has_expiry": False,
            "is_serialized": False,
            "tax_rate": 18.0,
            "tax_type": "inclusive",
            "description": "Test item with auth"
        }
        
        print("\n=== Testing API endpoint logic ===")
        
        # Check if item with same SKU exists
        existing_item = db.query(Item).filter(
            Item.item_code == item_dict['sku'],
            Item.account_id == user.account_id
        ).first()
        
        if existing_item:
            print(f"❌ Item with SKU '{item_dict['sku']}' already exists")
            return
        
        # Simulate the API mapping logic with Decimal conversion
        
        def to_decimal(value, default=0):
            """Convert value to Decimal, handling None and invalid values."""
            if value is None:
                return Decimal(str(default)) if default is not None else None
            try:
                return Decimal(str(value))
            except:
                return Decimal(str(default)) if default is not None else None
        
        mapped_data = {
            # Required fields
            'account_id': user.account_id,
            'item_code': item_dict.get('sku'),
            'name': item_dict.get('name'),
            'selling_price': to_decimal(item_dict.get('selling_price') or item_dict.get('unit_price'), 0),
            
            # Optional fields
            'description': item_dict.get('description', ''),
            'category': 'General',  # Default category
            'unit': item_dict.get('unit_of_measure', 'pcs'),
            'purchase_price': to_decimal(item_dict.get('cost_price') or item_dict.get('unit_price')),
            'tax_rate': to_decimal(item_dict.get('tax_rate'), 18.0),
            'stock_quantity': to_decimal(item_dict.get('current_stock'), 0),
            'reorder_level': to_decimal(item_dict.get('minimum_stock'), 0),
            'expiry_date': item_dict.get('expiry_date'),
            'is_active': item_dict.get('is_active', True),
            
            # Additional fields
            'current_stock': to_decimal(item_dict.get('current_stock'), 0),
            'cost_price': to_decimal(item_dict.get('cost_price') or item_dict.get('unit_price')),
            'minimum_stock': to_decimal(item_dict.get('minimum_stock'), 0),
            'maximum_stock': to_decimal(item_dict.get('maximum_stock')),
            'sku': item_dict.get('sku'),
            'barcode': item_dict.get('barcode'),
            'category_account_id': user.account_id if item_dict.get('category_id') else None,
            'category_id': item_dict.get('category_id'),
            'mrp': to_decimal(item_dict.get('selling_price')),
            'weight': to_decimal(item_dict.get('weight')),
            'dimensions': item_dict.get('dimensions'),
            'is_service': False,
            'track_inventory': True,
            'has_expiry': item_dict.get('has_expiry', False),
            'shelf_life_days': item_dict.get('shelf_life_days')
        }
        
        print("Mapped data:")
        for key, value in mapped_data.items():
            print(f"  {key}: {value} ({type(value)})")
        
        # Validate required fields
        if not mapped_data['item_code']:
            print("❌ SKU (item_code) is required")
            return
        
        if not mapped_data['name']:
            print("❌ Name is required")
            return
        
        if not mapped_data['selling_price']:
            print("❌ Selling price is required")
            return
        
        # Try to create the item
        try:
            item = Item(**mapped_data)
            print("✅ Item object created successfully")
            
            db.add(item)
            db.flush()  # This will trigger any constraint violations
            print("✅ Item added to database successfully")
            
            db.rollback()  # Don't actually save
            print("🧹 Rolled back transaction")
            
        except Exception as e:
            print(f"❌ Error creating/adding item: {e}")
            print("Error details:")
            import traceback
            traceback.print_exc()
            db.rollback()
            
    finally:
        db.close()

if __name__ == "__main__":
    test_with_mock_auth()
