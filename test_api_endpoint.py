#!/usr/bin/env python3
"""
Test the API endpoint for creating items.
"""

import requests
import json

def test_api_endpoint():
    """Test the API endpoint."""
    
    # Test data matching frontend structure
    test_item = {
        "name": "API Test Item",
        "sku": "API-TEST-001", 
        "category_id": 1,
        "unit_price": 100.0,
        "selling_price": 120.0,
        "current_stock": 10,
        "minimum_stock": 5,
        "unit_of_measure": "pcs",
        "is_active": True,
        "has_expiry": False,
        "is_serialized": False,
        "tax_rate": 18.0,
        "tax_type": "inclusive",
        "description": "Test item via API"
    }
    
    print("Testing API endpoint...")
    print("Request data:", json.dumps(test_item, indent=2))
    
    try:
        # Note: This will fail without proper authentication
        # But we can see if the server is responding
        response = requests.post(
            "http://localhost:8001/api/inventory/items",
            json=test_item,
            headers={"Content-Type": "application/json"},
            timeout=5
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        if response.status_code == 401:
            print("✅ Server is responding (authentication required)")
        elif response.status_code == 500:
            print("❌ Server error - check logs")
            print("Response text:", response.text[:500])
        else:
            print("Response text:", response.text[:500])
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_api_endpoint()
