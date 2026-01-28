"""Test script to check payments API response format."""

import requests
import json

# You'll need to get a valid token first by logging in
# For now, let's just test without auth to see the response structure

def test_payments_endpoint():
    """Test the payments API endpoint."""
    
    # First, let's just check what the endpoint returns
    # You'll need to replace this with your actual auth token
    base_url = "http://localhost:8001"
    
    # Check if server is running
    try:
        response = requests.get(f"{base_url}/docs", timeout=2)
        print(f"✅ Backend server is running")
    except:
        print(f"❌ Backend server is not running")
        return
    
    # Try to get payments (will fail without auth, but we can see the error structure)
    try:
        response = requests.get(f"{base_url}/api/sales/payments/", timeout=2)
        print(f"\n📊 Response Status: {response.status_code}")
        print(f"📊 Response Headers: {dict(response.headers)}")
        print(f"📊 Response Body: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"📊 Parsed JSON type: {type(data)}")
            print(f"📊 Parsed JSON: {data}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_payments_endpoint()
