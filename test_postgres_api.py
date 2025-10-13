#!/usr/bin/env python3
"""
Test PostgreSQL API endpoints.
"""

import requests
import json

def test_postgres_api():
    """Test the PostgreSQL API endpoints."""
    
    base_url = "http://localhost:8001"
    
    print("🐘 Testing PostgreSQL API Endpoints")
    print("=" * 50)
    
    # Test 1: Health Check
    print("\n1. Testing Health Check...")
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Health: {data['status']}")
            print(f"   📊 Database: {data['database']}")
            print(f"   🔢 Version: {data['version']}")
        else:
            print(f"   ❌ Health check failed: {response.text}")
    except Exception as e:
        print(f"   ❌ Health check error: {e}")
    
    # Test 2: Root Endpoint
    print("\n2. Testing Root Endpoint...")
    try:
        response = requests.get(f"{base_url}/", timeout=5)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ API: {data['message']}")
            print(f"   🔢 Version: {data['version']}")
            print(f"   📊 Database: {data['database']}")
        else:
            print(f"   ❌ Root endpoint failed: {response.text}")
    except Exception as e:
        print(f"   ❌ Root endpoint error: {e}")
    
    # Test 3: User Registration
    print("\n3. Testing User Registration...")
    user_data = {
        "username": "testuser_pg",
        "email": "testuser_pg@example.com",
        "full_name": "PostgreSQL Test User",
        "password": "testpassword123",
        "account_id": "TestAccount"
    }
    
    try:
        response = requests.post(
            f"{base_url}/api/auth/register",
            json=user_data,
            timeout=5
        )
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            user = response.json()
            print(f"   ✅ User created: {user['username']} (ID: {user['id']})")
        elif response.status_code == 400:
            print(f"   ⚠️ User might already exist: {response.json()['detail']}")
        else:
            print(f"   ❌ Registration failed: {response.text}")
    except Exception as e:
        print(f"   ❌ Registration error: {e}")
    
    # Test 4: User Login
    print("\n4. Testing User Login...")
    login_data = {
        "identifier": "testuser_pg",
        "password": "testpassword123",
        "account_id": "TestAccount",
    }
    
    access_token = None
    try:
        response = requests.post(
            f"{base_url}/api/auth/login",
            json=login_data,
            timeout=5
        )
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            token_data = response.json()
            access_token = token_data.get('access_token')
            print(f"   ✅ Login successful: {token_data.get('token_type','bearer')} token received")
        else:
            print(f"   ❌ Login failed: {response.text}")
    except Exception as e:
        print(f"   ❌ Login error: {e}")
    
    # Test 5: Inventory Operations (if logged in)
    if access_token:
        headers = {"Authorization": f"Bearer {access_token}"}
        
        print("\n5. Testing Inventory Item Creation...")
        item_data = {
            "name": "PostgreSQL API Test Item",
            "sku": "PG-API-001",
            "category_id": 1,
            "unit_price": 100.0,
            "selling_price": 120.0,
            "current_stock": 10.0,
            "minimum_stock": 5.0,
            "unit_of_measure": "pcs",
            "is_active": True,
            "has_expiry": False,
            "tax_rate": 18.0,
            "description": "Test item via PostgreSQL API"
        }
        
        try:
            response = requests.post(
                f"{base_url}/api/inventory/items",
                json=item_data,
                headers=headers,
                timeout=5
            )
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                item = response.json()
                print(f"   ✅ Item created: {item['name']} (ID: {item['id']})")
                item_id = item['id']
                
                # Test 6: Get Items List
                print("\n6. Testing Get Items List...")
                response = requests.get(
                    f"{base_url}/api/inventory/items",
                    headers=headers,
                    timeout=5
                )
                if response.status_code == 200:
                    items_data = response.json()
                    print(f"   ✅ Found {len(items_data['items'])} items")
                else:
                    print(f"   ❌ Get items failed: {response.text}")
                
                # Test 7: Update Item
                print("\n7. Testing Item Update...")
                update_data = {
                    "name": "Updated PostgreSQL API Test Item",
                    "selling_price": 150.0
                }
                response = requests.put(
                    f"{base_url}/api/inventory/items/{item_id}",
                    json=update_data,
                    headers=headers,
                    timeout=5
                )
                if response.status_code == 200:
                    updated_item = response.json()
                    print(f"   ✅ Item updated: {updated_item['name']}")
                else:
                    print(f"   ❌ Update failed: {response.text}")
                
                # Test 8: Delete Item
                print("\n8. Testing Item Deletion...")
                response = requests.delete(
                    f"{base_url}/api/inventory/items/{item_id}",
                    headers=headers,
                    timeout=5
                )
                if response.status_code == 200:
                    result = response.json()
                    print(f"   ✅ Item deleted: {result['message']}")
                else:
                    print(f"   ❌ Delete failed: {response.text}")
                    
            else:
                print(f"   ❌ Item creation failed: {response.text}")
        except Exception as e:
            print(f"   ❌ Inventory error: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 PostgreSQL API testing completed!")

if __name__ == "__main__":
    test_postgres_api()
