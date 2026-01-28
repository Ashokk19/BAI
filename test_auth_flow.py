#!/usr/bin/env python3
"""
Test the complete authentication flow with PostgreSQL
"""

import requests
import json

BASE_URL = "http://localhost:8001"

def test_auth_flow():
    """Test complete authentication and API access flow."""
    
    print("🔐 Testing BAI PostgreSQL Authentication Flow")
    print("=" * 60)
    
    # Test 1: Register a new user
    print("\n1. Testing User Registration...")
    register_data = {
        "username": "testuser",
        "email": "test@example.com",
        "full_name": "Test User",
        "password": "testpassword123",
        "account_id": "TestAccount"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
        print(f"   Status: {response.status_code}")
        if response.status_code in (200, 201):
            print("   ✅ User registered successfully!")
            user_data = response.json()
            print(f"   User ID: {user_data.get('id')}")
        elif response.status_code == 400:
            print(f"   ⚠️  User might already exist: {response.json()}")
        else:
            print(f"   ❌ Registration failed: {response.json()}")
    except Exception as e:
        print(f"   ❌ Exception: {e}")
    
    # Test 2: Login with credentials
    print("\n2. Testing User Login...")
    login_data = {
        "identifier": "testuser",
        "password": "testpassword123",
        "account_id": "TestAccount",
    }
    
    access_token = None
    try:
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print("   ✅ Login successful!")
            token_data = response.json()
            access_token = token_data.get("access_token")
            print(f"   Token type: {token_data.get('token_type')}")
            print(f"   Access token: {access_token[:20]}..." if access_token else "No token")
        else:
            print(f"   ❌ Login failed: {response.json()}")
    except Exception as e:
        print(f"   ❌ Exception: {e}")
    
    if not access_token:
        print("\n❌ Cannot continue tests without access token")
        return
    
    # Test 3: Access protected endpoints
    headers = {"Authorization": f"Bearer {access_token}"}
    
    print("\n3. Testing Protected Endpoints...")
    
    # Test inventory summary
    print("\n   3a. Testing Inventory Summary...")
    try:
        response = requests.get(f"{BASE_URL}/api/inventory/", headers=headers)
        print(f"      Status: {response.status_code}")
        if response.status_code == 200:
            print("      ✅ Inventory summary accessible!")
            data = response.json()
            print(f"      Total items: {data.get('total_items', 0)}")
        else:
            print(f"      ❌ Failed: {response.json()}")
    except Exception as e:
        print(f"      ❌ Exception: {e}")
    
    # Test dashboard
    print("\n   3b. Testing Dashboard...")
    try:
        response = requests.get(f"{BASE_URL}/api/dashboard/", headers=headers)
        print(f"      Status: {response.status_code}")
        if response.status_code == 200:
            print("      ✅ Dashboard accessible!")
            data = response.json()
            print(f"      Timeline: {data.get('timeline')}")
        else:
            print(f"      ❌ Failed: {response.json()}")
    except Exception as e:
        print(f"      ❌ Exception: {e}")
    
    # Test customers
    print("\n   3c. Testing Customers...")
    try:
        response = requests.get(f"{BASE_URL}/api/customers/", headers=headers)
        print(f"      Status: {response.status_code}")
        if response.status_code == 200:
            print("      ✅ Customers accessible!")
            customers = response.json()
            print(f"      Customer count: {len(customers)}")
        else:
            print(f"      ❌ Failed: {response.json()}")
    except Exception as e:
        print(f"      ❌ Exception: {e}")
    
    # Test item creation
    print("\n   3d. Testing Item Creation...")
    item_data = {
        "name": "Test PostgreSQL Item",
        "sku": "PG001",
        "selling_price": 99.99,
        "description": "Test item created via PostgreSQL API"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/inventory/items", json=item_data, headers=headers)
        print(f"      Status: {response.status_code}")
        if response.status_code == 200:
            print("      ✅ Item created successfully!")
            item = response.json()
            print(f"      Item ID: {item.get('id')}")
            print(f"      Item name: {item.get('name')}")
        else:
            print(f"      ❌ Failed: {response.json()}")
    except Exception as e:
        print(f"      ❌ Exception: {e}")
    
    print("\n🎉 Authentication flow testing completed!")

if __name__ == "__main__":
    test_auth_flow()
