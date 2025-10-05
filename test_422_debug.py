#!/usr/bin/env python3
"""
Debug 422 errors in the PostgreSQL API
"""

import requests
import json

BASE_URL = "http://localhost:8001"

def test_endpoints():
    """Test various endpoints to identify 422 errors."""
    
    print("🔍 Testing BAI PostgreSQL API Endpoints")
    print("=" * 50)
    
    # Test 1: Health check
    print("\n1. Testing Health Check...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   ✅ Response: {response.json()}")
        else:
            print(f"   ❌ Error: {response.text}")
    except Exception as e:
        print(f"   ❌ Exception: {e}")
    
    # Test 2: Root endpoint
    print("\n2. Testing Root Endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   ✅ Response: {response.json()}")
        else:
            print(f"   ❌ Error: {response.text}")
    except Exception as e:
        print(f"   ❌ Exception: {e}")
    
    # Test 3: API docs
    print("\n3. Testing API Docs...")
    try:
        response = requests.get(f"{BASE_URL}/docs")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   ✅ API docs accessible")
        else:
            print(f"   ❌ Error: {response.text}")
    except Exception as e:
        print(f"   ❌ Exception: {e}")
    
    # Test 4: Inventory summary (requires auth)
    print("\n4. Testing Inventory Summary (no auth)...")
    try:
        response = requests.get(f"{BASE_URL}/api/inventory/")
        print(f"   Status: {response.status_code}")
        if response.status_code == 401:
            print(f"   ✅ Expected 401 (auth required): {response.json()}")
        elif response.status_code == 422:
            print(f"   ❌ 422 Error: {response.json()}")
        else:
            print(f"   ❓ Unexpected: {response.text}")
    except Exception as e:
        print(f"   ❌ Exception: {e}")
    
    # Test 5: Login endpoint
    print("\n5. Testing Login Endpoint...")
    try:
        login_data = {
            "username": "test@example.com",
            "password": "testpassword"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        print(f"   Status: {response.status_code}")
        if response.status_code == 422:
            print(f"   ❌ 422 Validation Error: {response.json()}")
        elif response.status_code == 401:
            print(f"   ✅ Expected 401 (invalid credentials): {response.json()}")
        else:
            print(f"   ❓ Response: {response.text}")
    except Exception as e:
        print(f"   ❌ Exception: {e}")

if __name__ == "__main__":
    test_endpoints()
