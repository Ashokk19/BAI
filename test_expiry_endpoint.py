#!/usr/bin/env python3
"""
Test script for expiry tracking endpoint
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from backend.config.settings import settings
from backend.models.item import Item

def test_expiry_tracking():
    """Test expiry tracking functionality"""
    try:
        # Create database connection
        engine = create_engine(settings.database_url)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        print("Testing expiry tracking...")
        
        # Test querying items with has_expiry field
        items_with_expiry = db.query(Item).filter(Item.has_expiry == True).all()
        print(f"✅ Found {len(items_with_expiry)} items with expiry tracking enabled")
        
        # Test querying all items to check if has_expiry field exists
        all_items = db.query(Item).limit(5).all()
        print(f"✅ Found {len(all_items)} total items")
        
        for item in all_items:
            print(f"  Item: {item.name}, has_expiry: {getattr(item, 'has_expiry', 'MISSING')}, shelf_life_days: {getattr(item, 'shelf_life_days', 'MISSING')}")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"❌ Expiry tracking test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_expiry_tracking()
