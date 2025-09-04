#!/usr/bin/env python3
"""
Detailed test for invoice creation to see the exact error.
"""

import requests
import json
from datetime import datetime

# API base URL
BASE_URL = "http://localhost:8001"

def test_login():
    """Test login to get authentication token."""
    login_data = {
        "identifier": "admin@bai.com",
        "password": "admin123",
        "account_id": "TestAccount"
    }
    
    response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
    if response.status_code == 200:
        token = response.json()["access_token"]
        print("✅ Login successful")
        return token
    else:
        print(f"❌ Login failed: {response.status_code}")
        print(response.text)
        return None

def test_invoice_creation_detailed(token):
    """Test creating an invoice with detailed error reporting."""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test invoice data
    invoice_data = {
        "account_id": "TestAccount",
        "customer_id": 1,
        "invoice_date": "2025-01-01T00:00:00",
        "currency": "INR",
        "billing_address": "Test Address",
        "customer_state": "Tamil Nadu",
        "company_state": "Tamil Nadu",
        "items": [
            {
                "item_id": 1,
                "item_name": "Test Item",
                "item_sku": "TEST-001",
                "quantity": 1,
                "unit_price": 100.00,
                "gst_rate": 18.0
            }
        ]
    }
    
    print("Creating test invoice...")
    print(f"Data: {json.dumps(invoice_data, indent=2)}")
    
    try:
        response = requests.post(f"{BASE_URL}/api/sales/invoices", json=invoice_data, headers=headers)
        print(f"Response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            invoice = response.json()
            print(f"✅ Invoice created: {invoice}")
            return invoice['id']
        else:
            print(f"❌ Invoice creation failed")
            print(f"Response text: {response.text}")
            
            # Try to parse error details
            try:
                error_details = response.json()
                print(f"Error details: {json.dumps(error_details, indent=2)}")
            except:
                print("Could not parse error response as JSON")
            
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request error: {e}")
        return None

if __name__ == "__main__":
    token = test_login()
    if token:
        test_invoice_creation_detailed(token)







