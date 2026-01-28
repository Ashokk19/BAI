#!/usr/bin/env python3
"""
Debug item creation by directly testing the database insertion.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy.orm import sessionmaker
from backend.database.database import engine
from backend.models.item import Item
from backend.models.user import User
from decimal import Decimal

def debug_create_item():
    """Debug item creation with all required fields."""
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Get a user
        user = db.query(User).first()
        if not user:
            print("❌ No users found!")
            return
        
        print(f"Using user: {user.account_id}")
        
        # Test with minimal required fields first
        print("\n=== Testing with MINIMAL required fields ===")
        minimal_item = Item(
            account_id=user.account_id,
            item_code='MIN-TEST-001',
            name='Minimal Test Item',
            selling_price=Decimal('100.00')
        )
        
        try:
            db.add(minimal_item)
            db.flush()  # This will trigger the NOT NULL violation if any
            print("✅ Minimal item creation successful")
            db.rollback()  # Don't actually save
        except Exception as e:
            print(f"❌ Minimal item creation failed: {e}")
            db.rollback()
        
        # Test with all fields that frontend might send
        print("\n=== Testing with ALL frontend fields ===")
        full_item_data = {
            # Required fields
            'account_id': user.account_id,
            'item_code': 'FULL-TEST-001',
            'name': 'Full Test Item',
            'selling_price': Decimal('120.00'),
            
            # Optional fields from frontend
            'description': 'Test item with all fields',
            'category': 'Electronics',
            'unit': 'pcs',
            'purchase_price': Decimal('100.00'),
            'tax_rate': Decimal('18.00'),
            'stock_quantity': Decimal('10.000'),
            'reorder_level': Decimal('5.000'),
            'is_active': True,
            
            # Additional fields
            'current_stock': Decimal('10.000'),
            'cost_price': Decimal('95.00'),
            'minimum_stock': Decimal('5.000'),
            'maximum_stock': Decimal('100.000'),
            'sku': 'FULL-TEST-001',
            'barcode': '1234567890123',
            'category_account_id': user.account_id,
            'category_id': 1,
            'mrp': Decimal('150.00'),
            'weight': Decimal('0.500'),
            'dimensions': '10x5x2 cm',
            'is_service': False,
            'track_inventory': True,
            'has_expiry': False,
            'shelf_life_days': None,
            'expiry_date': None
        }
        
        try:
            full_item = Item(**full_item_data)
            db.add(full_item)
            db.flush()  # This will trigger the NOT NULL violation if any
            print("✅ Full item creation successful")
            db.rollback()  # Don't actually save
        except Exception as e:
            print(f"❌ Full item creation failed: {e}")
            print("Error details:")
            import traceback
            traceback.print_exc()
            db.rollback()
        
        # Test what the actual API endpoint creates
        print("\n=== Testing API endpoint mapping ===")
        frontend_data = {
            "name": "API Mapped Test Item",
            "sku": "API-MAP-001",
            "category_id": 1,
            "unit_price": 100.0,
            "selling_price": 120.0,
            "current_stock": 10.0,
            "minimum_stock": 5.0,
            "unit_of_measure": "pcs",
            "is_active": True,
            "has_expiry": False,
            "is_serialized": False,
            "tax_rate": 18.0,
            "tax_type": "inclusive",
            "description": "Test item via API mapping"
        }
        
        # Simulate the API mapping logic
        mapped_data = {
            # Required fields
            'account_id': user.account_id,
            'item_code': frontend_data.get('sku'),
            'name': frontend_data.get('name'),
            'selling_price': Decimal(str(frontend_data.get('selling_price', 0))),
            
            # Optional fields
            'description': frontend_data.get('description', ''),
            'category': 'General',  # Default category
            'unit': frontend_data.get('unit_of_measure', 'pcs'),
            'purchase_price': Decimal(str(frontend_data.get('unit_price', 0))),
            'tax_rate': Decimal(str(frontend_data.get('tax_rate', 18.0))),
            'stock_quantity': Decimal(str(frontend_data.get('current_stock', 0))),
            'reorder_level': Decimal(str(frontend_data.get('minimum_stock', 0))),
            'is_active': frontend_data.get('is_active', True),
            
            # Additional fields
            'current_stock': Decimal(str(frontend_data.get('current_stock', 0))),
            'cost_price': Decimal(str(frontend_data.get('unit_price', 0))),
            'minimum_stock': Decimal(str(frontend_data.get('minimum_stock', 0))),
            'maximum_stock': None,
            'sku': frontend_data.get('sku'),
            'barcode': None,
            'category_account_id': user.account_id,
            'category_id': frontend_data.get('category_id'),
            'mrp': Decimal(str(frontend_data.get('selling_price', 0))),
            'weight': None,
            'dimensions': None,
            'is_service': False,
            'track_inventory': True,
            'has_expiry': frontend_data.get('has_expiry', False),
            'shelf_life_days': None,
            'expiry_date': None
        }
        
        try:
            api_item = Item(**mapped_data)
            db.add(api_item)
            db.flush()  # This will trigger the NOT NULL violation if any
            print("✅ API mapped item creation successful")
            db.rollback()  # Don't actually save
        except Exception as e:
            print(f"❌ API mapped item creation failed: {e}")
            print("Mapped data that caused error:")
            for key, value in mapped_data.items():
                print(f"  {key}: {value} ({type(value)})")
            print("\nError details:")
            import traceback
            traceback.print_exc()
            db.rollback()
            
    finally:
        db.close()

if __name__ == "__main__":
    debug_create_item()
