#!/usr/bin/env python3
"""
Test the item update endpoint.
"""

import requests
import json

def test_update_endpoint():
    """Test the item update API endpoint."""
    
    # Test data for updating item (using float for stock fields to match PostgreSQL DECIMAL)
    update_data = {
        "name": "Updated Test Item",
        "sku": "UPD-TEST-001", 
        "category_id": 1,
        "unit_price": 150.0,
        "selling_price": 180.0,
        "current_stock": 15.0,    # Changed to float
        "minimum_stock": 8.0,     # Changed to float
        "maximum_stock": 100.0,   # Added and using float
        "unit_of_measure": "kg",
        "is_active": True,
        "has_expiry": False,
        "description": "Updated test item via API"
    }
    
    print("Testing item update endpoint...")
    print("Update data:", json.dumps(update_data, indent=2))
    
    try:
        # Test updating item with ID 6 (from the error message)
        response = requests.put(
            "http://localhost:8001/api/inventory/items/6",
            json=update_data,
            headers={"Content-Type": "application/json"},
            timeout=5
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        if response.status_code == 401:
            print("✅ Server is responding (authentication required)")
        elif response.status_code == 422:
            print("❌ Validation error - check request data")
            try:
                error_data = response.json()
                print("Validation errors:", json.dumps(error_data, indent=2))
            except:
                print("Response text:", response.text[:500])
        elif response.status_code == 404:
            print("❌ Item not found")
        elif response.status_code == 200:
            print("✅ Update successful!")
            try:
                result = response.json()
                print("Updated item:", result.get('name', 'Unknown'))
            except:
                pass
        else:
            print(f"Response status: {response.status_code}")
            print("Response text:", response.text[:500])
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_update_endpoint()
