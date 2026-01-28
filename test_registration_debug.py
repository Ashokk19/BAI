#!/usr/bin/env python3
"""
Debug registration issues
"""

import requests
import json

BASE_URL = "http://localhost:8001"

def test_registration_formats():
    """Test different registration data formats."""
    
    print("🔍 Testing Registration Data Formats")
    print("=" * 50)
    
    # Test 1: Minimal data (what frontend might be sending)
    print("\n1. Testing with frontend-like data...")
    frontend_data = {
        "username": "Heratics",
        "first_name": "Ashok", 
        "last_name": "Kumar",
        "account_id": "TestAccount"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/auth/register", json=frontend_data)
        print(f"   Status: {response.status_code}")
        if response.status_code == 422:
            print("   ❌ Validation Error:")
            error_detail = response.json()
            print(json.dumps(error_detail, indent=2))
        elif response.status_code == 201:
            print("   ✅ Registration successful!")
            print(f"   Response: {response.json()}")
        else:
            print(f"   ❓ Response: {response.json()}")
    except Exception as e:
        print(f"   ❌ Exception: {e}")
    
    # Test 2: With all fields
    print("\n2. Testing with all fields...")
    complete_data = {
        "username": "testuser2",
        "email": "test2@example.com",
        "first_name": "Test",
        "last_name": "User",
        "password": "testpass123",
        "account_id": "test_account_002"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/auth/register", json=complete_data)
        print(f"   Status: {response.status_code}")
        if response.status_code == 422:
            print("   ❌ Validation Error:")
            error_detail = response.json()
            print(json.dumps(error_detail, indent=2))
        elif response.status_code == 201:
            print("   ✅ Registration successful!")
            print(f"   Response: {response.json()}")
        else:
            print(f"   ❓ Response: {response.json()}")
    except Exception as e:
        print(f"   ❌ Exception: {e}")

if __name__ == "__main__":
    test_registration_formats()
