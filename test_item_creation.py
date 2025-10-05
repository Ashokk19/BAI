#!/usr/bin/env python3
"""
Test item creation to debug 422 errors
"""

import requests
import json

BASE_URL = "http://localhost:8001"

def test_item_creation():
    """Test creating an item with minimal required fields."""
    
    print("🔍 Testing Item Creation")
    print("=" * 50)
    
    # Test with minimal required fields
    item_data = {
        "name": "Test Item",
        "sku": "TEST001",
        "selling_price": 100.0
    }
    
    print(f"\n📦 Creating item with data: {json.dumps(item_data, indent=2)}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/inventory/items", 
            json=item_data
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code == 422:
            print("❌ 422 Validation Error:")
            error_detail = response.json()
            print(json.dumps(error_detail, indent=2))
        elif response.status_code == 401:
            print("✅ Expected 401 (auth required)")
            print(f"Response: {response.json()}")
        elif response.status_code == 200:
            print("✅ Item created successfully!")
            print(f"Response: {response.json()}")
        else:
            print(f"❓ Unexpected status: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")

if __name__ == "__main__":
    test_item_creation()
