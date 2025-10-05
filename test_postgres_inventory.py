#!/usr/bin/env python3
"""
Test the PostgreSQL inventory service (no SQLAlchemy).
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.services.postgres_inventory_service import PostgresInventoryService

def test_postgres_inventory():
    """Test PostgreSQL inventory operations."""
    
    print("=== Testing PostgreSQL Inventory Service ===")
    
    # Test data
    test_account_id = "TestAccount"
    test_item_data = {
        'item_code': 'PG-TEST-001',
        'name': 'PostgreSQL Test Item',
        'selling_price': 120.00,
        'description': 'Test item using direct PostgreSQL',
        'category': 'Electronics',
        'unit': 'pcs',
        'purchase_price': 100.00,
        'tax_rate': 18.0,
        'current_stock': 10.0,
        'minimum_stock': 5.0,
        'sku': 'PG-TEST-001',
        'is_active': True,
        'track_inventory': True,
        'has_expiry': False
    }
    
    try:
        # Test 1: Check if item exists (should be False)
        print("\n1. Testing item existence check...")
        exists = PostgresInventoryService.check_item_exists('PG-TEST-001', test_account_id)
        print(f"   Item exists: {exists}")
        
        # Test 2: Create item
        print("\n2. Testing item creation...")
        try:
            created_item = PostgresInventoryService.create_item(test_item_data, test_account_id)
            if created_item:
                print(f"   ✅ Item created: ID={created_item['id']}, Name='{created_item['name']}'")
                item_id = created_item['id']
            else:
                print("   ❌ Failed to create item")
                return
        except Exception as e:
            print(f"   ❌ Error creating item: {e}")
            import traceback
            traceback.print_exc()
            return
        
        # Test 3: Get item by ID
        print("\n3. Testing get item by ID...")
        retrieved_item = PostgresInventoryService.get_item_by_id(item_id, test_account_id)
        if retrieved_item:
            print(f"   ✅ Item retrieved: {retrieved_item['name']}")
        else:
            print("   ❌ Failed to retrieve item")
        
        # Test 4: Update item
        print("\n4. Testing item update...")
        update_data = {
            'name': 'Updated PostgreSQL Test Item',
            'selling_price': 150.00,
            'description': 'Updated description'
        }
        updated_item = PostgresInventoryService.update_item(item_id, update_data, test_account_id)
        if updated_item:
            print(f"   ✅ Item updated: {updated_item['name']}")
        else:
            print("   ❌ Failed to update item")
        
        # Test 5: Get items list
        print("\n5. Testing items list...")
        items_list = PostgresInventoryService.get_items_list(test_account_id, limit=10)
        print(f"   ✅ Found {len(items_list)} items")
        
        # Test 6: Log inventory action
        print("\n6. Testing inventory logging...")
        log_success = PostgresInventoryService.log_inventory_action(
            item_id=item_id,
            account_id=test_account_id,
            action="test_action",
            notes="Test log entry",
            user_id=1
        )
        if log_success:
            print("   ✅ Inventory action logged")
        else:
            print("   ❌ Failed to log inventory action")
        
        # Test 7: Delete item
        print("\n7. Testing item deletion...")
        delete_success = PostgresInventoryService.delete_item(item_id, test_account_id)
        if delete_success:
            print("   ✅ Item deleted successfully")
        else:
            print("   ❌ Failed to delete item")
        
        print("\n🎉 All PostgreSQL inventory tests completed!")
        
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_postgres_inventory()
