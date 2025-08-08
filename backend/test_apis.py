"""
Simple script to test the new sales API endpoints.
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8001/api"

def test_apis():
    """Test the new sales API endpoints."""
    
    # Test headers for authentication
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer test-token"
    }
    
    try:
        # Test sales overview
        print("Testing sales overview...")
        response = requests.get(f"{BASE_URL}/sales/")
        print(f"Sales Overview: {response.status_code}")
        if response.status_code == 200:
            print(json.dumps(response.json(), indent=2))
        
        # Test customers endpoint
        print("\nTesting customers endpoint...")
        response = requests.get(f"{BASE_URL}/sales/customers/")
        print(f"Customers: {response.status_code}")
        if response.status_code == 200:
            customers = response.json()
            print(f"Found {customers.get('total', 0)} customers")
        
        # Test payments endpoint
        print("\nTesting payments endpoint...")
        response = requests.get(f"{BASE_URL}/sales/payments/")
        print(f"Payments: {response.status_code}")
        
        # Test credits endpoint
        print("\nTesting credits endpoint...")
        response = requests.get(f"{BASE_URL}/sales/credits/")
        print(f"Credits: {response.status_code}")
        
        # Test returns endpoint
        print("\nTesting returns endpoint...")
        response = requests.get(f"{BASE_URL}/sales/returns/")
        print(f"Returns: {response.status_code}")
        
        # Test shipments endpoint
        print("\nTesting shipments endpoint...")
        response = requests.get(f"{BASE_URL}/sales/shipments/")
        print(f"Shipments: {response.status_code}")
        
        print("\nAll API endpoints tested!")
        
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the server. Is it running on port 8001?")
    except Exception as e:
        print(f"Error testing APIs: {e}")

if __name__ == "__main__":
    test_apis() 