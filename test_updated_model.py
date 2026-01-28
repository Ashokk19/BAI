#!/usr/bin/env python3
"""
Test the updated item model with PostgreSQL schema.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy.orm import sessionmaker
from backend.database.database import engine
from backend.models.item import Item
from backend.models.user import User
from decimal import Decimal

def test_updated_model():
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
        
        # Create test item with complete PostgreSQL schema
        test_item = Item(
            # Required fields
            account_id=user.account_id,
            item_code='TEST-PG-001',
            name='Test PostgreSQL Item',
            selling_price=Decimal('120.00'),
            
            # Optional fields
            description='Test item with full PostgreSQL schema',
            category='Electronics',
            unit='pcs',
            purchase_price=Decimal('100.00'),
            tax_rate=Decimal('18.00'),
            stock_quantity=Decimal('10.000'),
            reorder_level=Decimal('5.000'),
            is_active=True,
            
            # Additional fields
            current_stock=Decimal('10.000'),
            cost_price=Decimal('95.00'),
            minimum_stock=Decimal('5.000'),
            maximum_stock=Decimal('100.000'),
            sku='TEST-PG-001',
            barcode='1234567890',
            category_account_id=user.account_id,
            category_id=1,
            mrp=Decimal('150.00'),
            weight=Decimal('0.500'),
            dimensions='10x5x2 cm',
            is_service=False,
            track_inventory=True,
            has_expiry=False,
            shelf_life_days=None
        )
        
        print("Creating item with PostgreSQL schema...")
        
        db.add(test_item)
        db.commit()
        db.refresh(test_item)
        
        print(f"✅ Successfully created item: ID={test_item.id}")
        print(f"   Name: {test_item.name}")
        print(f"   SKU: {test_item.sku}")
        print(f"   Unit Price (computed): {test_item.unit_price}")
        print(f"   Stock Value (computed): {test_item.stock_value}")
        
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
    test_updated_model()
