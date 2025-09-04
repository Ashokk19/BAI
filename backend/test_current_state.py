#!/usr/bin/env python3
"""
Test script to check current state of invoices, delivery notes, and shipments.
"""

import requests
import json

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

def check_current_state(token):
    """Check current state of data."""
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n🔍 Checking Current Data State...")
    print("=" * 50)
    
    # Check invoices
    print("\n📄 Invoices:")
    response = requests.get(f"{BASE_URL}/api/sales/invoices", headers=headers)
    if response.status_code == 200:
        invoices = response.json()
        print(f"   Found {len(invoices)} invoices")
        if isinstance(invoices, list):
            for invoice in invoices[:3]:  # Show first 3
                print(f"   - ID: {invoice['id']}, Number: {invoice['invoice_number']}, Customer: {invoice['customer_id']}")
        else:
            print(f"   Response format: {type(invoices)}")
            print(f"   Response keys: {list(invoices.keys()) if isinstance(invoices, dict) else 'N/A'}")
    else:
        print(f"   ❌ Failed to fetch invoices: {response.status_code}")
    
    # Check delivery notes
    print("\n📋 Delivery Notes:")
    response = requests.get(f"{BASE_URL}/api/sales/shipments/delivery-notes", headers=headers)
    if response.status_code == 200:
        delivery_notes = response.json()
        print(f"   Found {len(delivery_notes)} delivery notes")
        if isinstance(delivery_notes, list):
            for note in delivery_notes[:3]:  # Show first 3
                print(f"   - ID: {note['id']}, Invoice: {note['invoice_id']}, Status: {note['delivery_status']}")
        else:
            print(f"   Response format: {type(delivery_notes)}")
            print(f"   Response keys: {list(delivery_notes.keys()) if isinstance(delivery_notes, dict) else 'N/A'}")
    else:
        print(f"   ❌ Failed to fetch delivery notes: {response.status_code}")
    
    # Check shipments
    print("\n🚚 Shipments:")
    response = requests.get(f"{BASE_URL}/api/sales/shipments", headers=headers)
    if response.status_code == 200:
        shipments = response.json()
        print(f"   Found {len(shipments)} shipments")
        if isinstance(shipments, list):
            for shipment in shipments[:3]:  # Show first 3
                print(f"   - ID: {shipment['id']}, Invoice: {shipment['invoice_id']}, Status: {shipment['status']}")
        else:
            print(f"   Response format: {type(shipments)}")
            print(f"   Response keys: {list(shipments.keys()) if isinstance(shipments, dict) else 'N/A'}")
    else:
        print(f"   ❌ Failed to fetch shipments: {response.status_code}")
    
    # Check payments
    print("\n💰 Payments:")
    response = requests.get(f"{BASE_URL}/api/sales/payments", headers=headers)
    if response.status_code == 200:
        payments = response.json()
        print(f"   Found {len(payments)} payments")
        if isinstance(payments, list):
            for payment in payments[:3]:  # Show first 3
                print(f"   - ID: {payment['id']}, Invoice: {payment['invoice_id']}, Status: {payment['payment_status']}")
        else:
            print(f"   Response format: {type(payments)}")
            print(f"   Response keys: {list(payments.keys()) if isinstance(payments, dict) else 'N/A'}")
    else:
        print(f"   ❌ Failed to fetch payments: {response.status_code}")

if __name__ == "__main__":
    token = test_login()
    if token:
        check_current_state(token)
